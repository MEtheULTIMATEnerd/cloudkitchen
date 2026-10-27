// src/app/components/recipes/view-recipe/view-recipe.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { RecipeService } from '../../../services/recipe.service';
import { Recipe } from '../../../models/recipe';
import { AiService } from '../../../services/ai.service';

// Extended to match backend structure
type AiAnalysis = {
  provider?: string;
  healthScore: number;    // 0..100
  summary: string;
  concerns?: string[];    // backend may return "concerns" or "risks"
  risks?: string[];
  suggestions?: string[];
  servings?: number;
  totals?: {
    grams?: number;
    kcal?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    fiber?: number;
    satFat?: number;
    sodiumMg?: number;
  };
  perServing?: {
    grams?: number;
    kcal?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    fiber?: number;
    satFat?: number;
    sodiumMg?: number;
  };
  flags?: {
    anyProcessedMeat?: boolean;
    anyUnsatFat?: boolean;
    anyWholeGrain?: boolean;
    goodProtein?: boolean;
  };
};

@Component({
  selector: 'app-view-recipe',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './view-recipe.html'
})
export class ViewRecipeComponent implements OnInit {
  private api   = inject(RecipeService);
  private route = inject(ActivatedRoute);
  private ai    = inject(AiService);

  recipe  = signal<Recipe | null>(null);
  error   = signal<string | null>(null);
  loading = signal(false);

  // HD: AI Analysis state
  analyzing = signal(false);
  analysis  = signal<AiAnalysis | null>(null);
  aiError   = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!id) { this.error.set('Missing recipeId'); return; }

    this.loading.set(true);
    this.api.getOne(id).subscribe({
      next: (r) => { this.recipe.set(r); this.loading.set(false); },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to load');
        this.loading.set(false);
      }
    });
  }

  // ---- HD Task 1: AI Health Analysis ----
  analyzeHealth() {
    const r = this.recipe();
    if (!r) return;

    this.analyzing.set(true);
    this.aiError.set(null);
    this.analysis.set(null);

    const ingredients: string[] = Array.isArray(r.ingredients)
      ? r.ingredients
      : String(r.ingredients || '').split('\n').map(s => s.trim()).filter(Boolean);

    this.ai.analyze({ title: r.title, ingredients }).subscribe({
      next: (resp: any) => {
        this.analyzing.set(false);
        if (resp?.ok && resp.result) {
          const res = resp.result;

          // Normalize possible keys ("concerns" vs "risks")
          const risks: string[] = Array.isArray(res.risks)
            ? res.risks
            : Array.isArray(res.concerns)
            ? res.concerns
            : [];

          // Combine everything safely
          const normalized: AiAnalysis = {
            provider: res.provider,
            healthScore: Number(res.healthScore ?? 0),
            summary: String(res.summary ?? 'No summary provided.'),
            risks,
            suggestions: Array.isArray(res.suggestions) ? res.suggestions : [],
            servings: res.servings,
            totals: res.totals,
            perServing: res.perServing,
            flags: res.flags
          };

          this.analysis.set(normalized);
        } else {
          this.aiError.set(resp?.message || 'Analysis failed.');
        }
      },
      error: (err) => {
        this.analyzing.set(false);
        this.aiError.set(err?.error?.message || 'Analysis failed.');
      }
    });
  }

  // trackBy for simple string arrays
  trackByIndex = (index: number) => index;
}