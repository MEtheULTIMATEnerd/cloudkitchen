import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { InventoryService } from '../../../services/inventory.service';

// ===== parser + validator =====
const ALLOWED_UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'packs'] as const;
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

// OPTIONAL validator — empty is OK (we'll use quantity+unit as fallback)
function quantityWithUnitValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v = String(ctrl.value ?? '').trim();
  if (!v) return null;            // allow empty
  return parseQtyUnit(v) ? null : { qtyUnit: true };
}

function toISO(d: string | null | undefined): string | undefined {
  if (!d) return undefined;
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
// ===========================================

@Component({
  selector: 'app-edit-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './edit-inventory.html'
})
export class EditInventoryComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(InventoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(false);
  saving  = signal(false);
  error   = signal<string | null>(null);
  itemId  = '';

  form = this.fb.group({
    ingredientName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],

    // helper field (optional, e.g., "2 pcs")
    quantityWithUnit: ['', [quantityWithUnitValidator]],

    // explicit pair (used in UI and as fallback)
    quantity: [0, [Validators.required, Validators.min(0)]],
    unit: ['', Validators.required],

    category: ['', Validators.required],
    purchaseDate: ['', Validators.required],
    expirationDate: ['', Validators.required],
    location: ['', Validators.required],
    cost: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.itemId) { this.error.set('Missing item id'); return; }

    // If user edits numeric quantity or unit, clear the combined field
    this.form.get('quantity')?.valueChanges.subscribe(() => {
      this.form.get('quantityWithUnit')?.setValue('', { emitEvent: false });
    });
    this.form.get('unit')?.valueChanges.subscribe(() => {
      this.form.get('quantityWithUnit')?.setValue('', { emitEvent: false });
    });

    this.loading.set(true);
    this.api.getOne(this.itemId).subscribe({
      next: (it: any) => {
        if (!it) { this.error.set('Item not found'); this.loading.set(false); return; }

        this.form.patchValue({
          ingredientName: it.ingredientName ?? '',
          quantityWithUnit: (it.quantity != null && it.unit) ? `${it.quantity} ${it.unit}` : '',
          quantity: it.quantity ?? 0,
          unit: it.unit ?? '',
          category: it.category ?? '',
          location: it.location ?? '',
          cost: it.cost ?? 0,
          purchaseDate: (it.purchaseDate ?? '').slice(0, 10),
          expirationDate: (it.expirationDate ?? '').slice(0, 10),
        });

        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err?.error?.message || 'Failed to load item.');
        this.loading.set(false);
      }
    });
  }

  save(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value as any;

    // Prefer numeric+unit if the user touched either of those controls.
    const quantityCtrl = this.form.get('quantity');
    const unitCtrl     = this.form.get('unit');
    const preferPair   = !!(quantityCtrl?.dirty || unitCtrl?.dirty);

    const parsed = parseQtyUnit(String(v.quantityWithUnit || ''));
    let qty: number;
    let unit: string;

    if (preferPair) {
      qty  = Number(v.quantity);
      unit = String(v.unit || '').trim();
    } else if (parsed) {
      qty  = parsed.quantity;
      unit = parsed.unit;
    } else {
      // no combined value and pair not dirty → use current pair as-is
      qty  = Number(v.quantity);
      unit = String(v.unit || '').trim();
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      this.error.set('Quantity must be a positive number.');
      return;
    }
    if (!ALLOWED_UNITS.includes(unit as AllowedUnit)) {
      this.error.set(`Unit must be one of: ${ALLOWED_UNITS.join(', ')}`);
      return;
    }

    const payload = {
      inventoryId: this.itemId,
      ingredientName: String(v.ingredientName).trim(),
      quantity: qty,
      unit,
      category: String(v.category).trim(),
      purchaseDate: toISO(v.purchaseDate)!,
      expirationDate: toISO(v.expirationDate)!,
      location: String(v.location).trim(),
      cost: Number(v.cost)
    };

    this.saving.set(true);
    this.api.update(payload).subscribe({
      next: () => { this.saving.set(false); this.router.navigate(['/inventory']); },
      error: (err) => {
        this.error.set(err?.error?.message || err?.message || 'Update failed.');
        this.saving.set(false);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/inventory']);
  }
}