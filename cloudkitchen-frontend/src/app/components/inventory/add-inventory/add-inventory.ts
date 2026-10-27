// inventory/add-inventory.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InventoryService } from '../../../services/inventory.service';

// ---- quantity-with-unit parser & validator ----
const ALLOWED_UNITS = ['g', 'kg', 'ml', 'L', 'l', 'pcs', 'packs'] as const;
type AllowedUnit = (typeof ALLOWED_UNITS)[number];

function parseQtyUnit(input: string): { quantity: number; unit: AllowedUnit } | null {
  const s = String(input || '').trim();
  const m = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]+)$/);
  if (!m) return null;
  let [, q, u] = m;
  u = u === 'l' ? 'L' : u.toLowerCase();
  if (!ALLOWED_UNITS.includes(u as AllowedUnit)) return null;
  const quantity = Number(q);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return { quantity, unit: u as AllowedUnit };
}

function quantityWithUnitValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v = ctrl.value;
  if (!v) return { qtyUnit: true };
  return parseQtyUnit(String(v)) ? null : { qtyUnit: true };
}

function toISO(d: string | null | undefined): string | undefined {
  if (!d) return undefined;
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
// ------------------------------------------------

@Component({
  selector: 'app-add-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './add-inventory.html'
})
export class AddInventoryComponent {
  private fb = inject(FormBuilder);
  private api = inject(InventoryService);
  private router = inject(Router);

  form = this.fb.group({
    ingredientName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    quantityWithUnit: ['', [quantityWithUnitValidator]],
    category: ['Other', Validators.required],
    purchaseDate: ['', Validators.required],
    expirationDate: ['', Validators.required],
    location: ['', Validators.required],
    cost: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  submitting = false;
  errorMsg: string | null = null;

  isInvalid(name: string) {
    const c = this.form.get(name);
    return !!(c && c.touched && c.invalid);
  }

  onSubmit() {
    this.errorMsg = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg = 'Please fix the highlighted fields.';
      return;
    }

    const v = this.form.value;
    const pq = parseQtyUnit(String(v.quantityWithUnit));
    if (!pq) {
      this.errorMsg = 'Enter quantity like “2 kg”, “500 ml”, or “12 pcs”.';
      return;
    }

    const payload = {
      ingredientName: String(v.ingredientName).trim(),
      quantity: pq.quantity,
      unit: pq.unit,
      category: String(v.category).trim(),
      purchaseDate: toISO(v.purchaseDate),
      expirationDate: toISO(v.expirationDate),
      location: String(v.location).trim(),
      cost: Number(v.cost)
    };

    this.submitting = true;
    this.api.create(payload).subscribe({
      next: () => { this.submitting = false; this.router.navigate(['/inventory']); },
      error: (err) => { this.submitting = false; this.errorMsg = err?.message || 'Failed to create item.'; }
    });
  }
}