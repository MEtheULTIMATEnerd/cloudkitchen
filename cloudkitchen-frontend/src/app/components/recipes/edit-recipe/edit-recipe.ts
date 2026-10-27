import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RecipeService } from '../../../services/recipe.service';
import { Recipe, toLines, MealType, CuisineType, Difficulty } from '../../../models/recipe';

@Component({
  selector: 'app-edit-recipe',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './edit-recipe.html'
})
export class EditRecipeComponent implements OnInit {
  private api = inject(RecipeService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  mealTypes: MealType[] = ['Breakfast','Lunch','Dinner','Snack'];
  cuisineTypes: CuisineType[] = ['Italian','Asian','Mexican','American','French','Indian','Mediterranean','Other'];
  difficulties: Difficulty[] = ['Easy','Medium','Hard'];

  recipeId = '';
  loading = signal(false);
  error   = signal<string | null>(null);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    chef: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s'-]{2,50}$/)]],
    ingredients: ['', Validators.required],
    instructions: ['', Validators.required],
    mealType: [null as MealType | null, Validators.required],
    cuisineType: [null as CuisineType | null, Validators.required],
    prepTime: [null as number | null, [Validators.required, Validators.min(1), Validators.max(480)]],
    difficulty: [null as Difficulty | null, Validators.required],
    servings: [null as number | null, [Validators.required, Validators.min(1), Validators.max(20)]],
  });

  ngOnInit(): void {
    this.recipeId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.recipeId) { this.error.set('Missing recipeId'); return; }

    this.loading.set(true);
    this.api.getOne(this.recipeId).subscribe({
      next: (r) => {
        this.form.setValue({
          title: r.title,
          chef: r.chef,
          ingredients: (r.ingredients || []).join('\n'),
          instructions: (r.instructions || []).join('\n'),
          mealType: r.mealType,
          cuisineType: r.cuisineType,
          prepTime: r.prepTime,
          difficulty: r.difficulty,
          servings: r.servings
        });
        this.loading.set(false);
      },
      error: (err) => { this.error.set(err?.error?.message || 'Failed to load'); this.loading.set(false); }
    });
  }

  isInvalid(ctrl: keyof typeof this.form.controls) {
    const c = this.form.controls[ctrl];
    return c.touched && c.invalid;
  }

  save() {
    this.error.set(null);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.value;
    const payload: Partial<Recipe> = {
      recipeId: this.recipeId,
      title: String(v.title).trim(),
      chef: String(v.chef).trim(),
      ingredients: toLines(v.ingredients || ''),
      instructions: toLines(v.instructions || ''),
      mealType: v.mealType as MealType,
      cuisineType: v.cuisineType as CuisineType,
      prepTime: Number(v.prepTime),
      difficulty: v.difficulty as Difficulty,
      servings: Number(v.servings)
    };

    this.api.update(payload).subscribe({
      next: () => this.router.navigate(['/recipes']),
      error: (err) => this.error.set(err?.error?.message || 'You are not allowed to edit other users recipes')
    });
  }
}