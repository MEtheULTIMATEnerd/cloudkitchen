import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RecipeService } from '../../../services/recipe.service';
import { MealType, CuisineType, Difficulty, Recipe, toLines } from '../../../models/recipe';

@Component({
  selector: 'app-add-recipe',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './add-recipe.html'
})
export class AddRecipeComponent {
  private fb = inject(FormBuilder);
  private api = inject(RecipeService);
  private router = inject(Router);

  mealTypes: MealType[] = ['Breakfast','Lunch','Dinner','Snack'];
  cuisineTypes: CuisineType[] = ['Italian','Asian','Mexican','American','French','Indian','Mediterranean','Other'];
  difficulties: Difficulty[] = ['Easy','Medium','Hard'];

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    chef: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s'-]{2,50}$/)]],
    ingredientsText: ['', Validators.required],
    instructionsText: ['', Validators.required],
    mealType: [null as MealType | null, Validators.required],
    cuisineType: [null as CuisineType | null, Validators.required],
    prepTime: [null as number | null, [Validators.required, Validators.min(1), Validators.max(480)]],
    difficulty: [null as Difficulty | null, Validators.required],
    servings: [null as number | null, [Validators.required, Validators.min(1), Validators.max(20)]],
  });

  submitting = false;
  errorMsg: string | null = null;

  constructor() {
    // Optional prefill from client storage if you set it at login
    const name = sessionStorage.getItem('fullname') || localStorage.getItem('fullname') || '';
    if (name) this.form.controls.chef.setValue(name);
  }

  isInvalid(ctrl: keyof typeof this.form.controls) {
    const c = this.form.controls[ctrl];
    return c.touched && c.invalid;
  }

  onSubmit() {
    this.errorMsg = null;
    if (this.form.invalid) {
      this.errorMsg = 'Some information is unfilled or invalid. Please fix the highlighted fields.';
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const payload: Partial<Recipe> = {
      title: String(v.title).trim(),
      chef: String(v.chef).trim(),
      ingredients: toLines(v.ingredientsText || ''),
      instructions: toLines(v.instructionsText || ''),
      mealType: v.mealType as MealType,
      cuisineType: v.cuisineType as CuisineType,
      prepTime: Number(v.prepTime),
      difficulty: v.difficulty as Difficulty,
      servings: Number(v.servings)
    };

    this.submitting = true;
    this.api.create(payload).subscribe({
      next: () => { this.submitting = false; this.router.navigate(['/recipes']); },
      error: (err) => { this.submitting = false; this.errorMsg = err?.error?.message || 'Failed to create recipe. Please try again.'; }
    });
  }
}