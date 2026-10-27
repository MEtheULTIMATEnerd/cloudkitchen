import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe';

type SortKey = 'title' | 'cuisine' | 'difficulty' | 'prep';

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recipes.html'
})
export class RecipesComponent implements OnInit {
  private api = inject(RecipeService);

  loading = signal(false);
  error   = signal<string | null>(null);
  recipes = signal<Recipe[]>([]);

  // Delete confirm modal state
  confirm = signal<{ id: string; title: string } | null>(null);

  // Search / filter / sort state
  q          = signal<string>('');
  filterCuisine    = signal<string>('');
  filterDifficulty = signal<string>('');
  sortKey    = signal<SortKey>('title');
  sortDir    = signal<'asc'|'desc'>('asc');

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: data => { this.recipes.set(data || []); this.loading.set(false); },
      error: ()   => { this.error.set('Failed to load recipes.'); this.loading.set(false); }
    });
  }

  // Distinct facet lists for filters
  cuisines = computed(() => {
    const set = new Set<string>();
    for (const r of this.recipes()) if (r.cuisineType) set.add(String(r.cuisineType));
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  });

  difficulties = computed(() => {
    const set = new Set<string>();
    for (const r of this.recipes()) if (r.difficulty) set.add(String(r.difficulty));
    // keep a friendly fixed order if it matches
    const order = ['Easy','Medium','Hard'];
    const arr = Array.from(set);
    return arr.every(v => order.includes(v))
      ? order.filter(v => set.has(v))
      : arr.sort((a,b)=>a.localeCompare(b));
  });

  // Filtered + sorted recipes for the view
  filteredRecipes = computed(() => {
    const text = this.q().trim().toLowerCase();
    const cuisine = this.filterCuisine();
    const diff    = this.filterDifficulty();
    const key     = this.sortKey();
    const dir     = this.sortDir();

    let list = this.recipes();

    // text match: title, chef, cuisine
    if (text) {
      list = list.filter(r =>
        r.title?.toLowerCase().includes(text) ||
        r.chef?.toLowerCase().includes(text) ||
        r.cuisineType?.toLowerCase().includes(text)
      );
    }

    if (cuisine) list = list.filter(r => r.cuisineType === cuisine);
    if (diff)    list = list.filter(r => r.difficulty === diff);

    // sort
    const sorted = [...list].sort((a, b) => {
      let va: number | string = '';
      let vb: number | string = '';
      switch (key) {
        case 'title':     va = (a.title || '').toLowerCase();     vb = (b.title || '').toLowerCase(); break;
        case 'cuisine':   va = (a.cuisineType || '').toLowerCase(); vb = (b.cuisineType || '').toLowerCase(); break;
        case 'difficulty':va = (a.difficulty || '').toLowerCase(); vb = (b.difficulty || '').toLowerCase(); break;
        case 'prep':      va = Number(a.prepTime) || 0;           vb = Number(b.prepTime) || 0; break;
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ?  1 : -1;
      return 0;
    });

    return sorted;
  });

  toggleSort(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  clearFilters() {
    this.q.set('');
    this.filterCuisine.set('');
    this.filterDifficulty.set('');
    this.sortKey.set('title');
    this.sortDir.set('asc');
  }

  // ---- Delete flow ----
  askDelete(r: Recipe) { this.confirm.set({ id: r.recipeId!, title: r.title }); }
  cancelDelete()       { this.confirm.set(null); }
  performDelete() {
    const c = this.confirm(); if (!c) return;
    this.api.deleteMany(c.id).subscribe({
      next: () => { this.confirm.set(null); this.load(); },
      error: (err) => { this.confirm.set(null); alert(err?.error?.message || 'Delete failed.'); }
    });
  }

  // ngFor trackBy
  trackRecipe = (_: number, r: Recipe) => r.recipeId ?? _;
}