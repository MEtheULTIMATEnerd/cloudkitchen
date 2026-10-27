import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InventoryItem } from '../../models/inventory';
import { InventoryService } from '../../services/inventory.service';

type SortKey = 'name' | 'exp' | 'qty' | 'cost';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './inventory.html'
})
export class InventoryComponent implements OnInit {
  private api = inject(InventoryService);
  private router = inject(Router);

  loading = signal(false);
  error   = signal<string | null>(null);
  items   = signal<InventoryItem[]>([]);

  // Filters
  q = signal('');
  cat = signal<string>('');
  loc = signal<string>('');
  showExpiredOnly = signal(false);
  showExpSoonOnly = signal(false);
  daysSoon = signal(7);
  lowStockThreshold = signal<number>(0);

  // Sorting
  sortKey = signal<SortKey>('exp');
  sortDir = signal<'asc' | 'desc'>('asc');

  // Delete confirm
  confirm = signal<{ id: string; name: string } | null>(null);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: data => { this.items.set(data || []); this.loading.set(false); },
      error: () => { this.error.set('Failed to load inventory.'); this.loading.set(false); }
    });
  }

  // ---- helpers ----
  private daysBetween(aISO: string, bISO?: string | null) {
    if (!bISO) return NaN;
    const a = new Date(aISO).getTime();
    const b = new Date(bISO).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
    return Math.floor((b - a) / (1000 * 60 * 60 * 24));
  }

  daysUntilExpiry(it: InventoryItem): number {
    return this.daysBetween(new Date().toISOString(), (it as any).expirationDate);
  }

  isExpired(it: InventoryItem) {
    const d = this.daysUntilExpiry(it);
    return Number.isFinite(d) && d < 0;
  }

  isExpiringSoon(it: InventoryItem): boolean {
    const d = this.daysUntilExpiry(it);
    return Number.isFinite(d) && d >= 0 && d <= this.daysSoon();
  }

  isLowStock(it: InventoryItem): boolean {
    const th = this.lowStockThreshold();
    return th > 0 && (Number((it as any).quantity) || 0) <= th;
  }

  // Normalize id field (supports inventoryId | itemId | id)
  getId(it: any): string {
    return it?.inventoryId ?? it?.itemId ?? it?.id ?? '';
  }

  // trackBy
  trackById = (_: number, it: InventoryItem | any) => this.getId(it) || _;

  // ---- computed: filtered & sorted list ----
  filteredSorted = computed(() => {
    const text = this.q().trim().toLowerCase();
    const cat  = this.cat();
    const loc  = this.loc();
    const soon = this.showExpSoonOnly();
    const expiredOnly = this.showExpiredOnly();
    const items = this.items();

    let out = items.filter((it: any) => {
      const matchesText =
        !text ||
        it.ingredientName?.toLowerCase().includes(text) ||
        it.category?.toString().toLowerCase().includes(text) ||
        it.location?.toLowerCase().includes(text);

      const matchesCat = !cat || it.category === cat;
      const matchesLoc = !loc || it.location === loc;

      let matchesExp = true;
      if (expiredOnly) matchesExp = this.isExpired(it);
      else if (soon)   matchesExp = this.isExpiringSoon(it);

      return matchesText && matchesCat && matchesLoc && matchesExp;
    });

    const key = this.sortKey();
    const dir = this.sortDir();

    out = out.slice().sort((a: any, b: any) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      switch (key) {
        case 'name':
          va = (a.ingredientName || '').toLowerCase();
          vb = (b.ingredientName || '').toLowerCase();
          break;
        case 'exp':
          va = new Date(a.expirationDate).getTime();
          vb = new Date(b.expirationDate).getTime();
          break;
        case 'qty':
          va = Number(a.quantity) || 0;
          vb = Number(b.quantity) || 0;
          break;
        case 'cost':
          va = Number(a.cost) || 0;
          vb = Number(b.cost) || 0;
          break;
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return out;
  });

  // ---- totals ----
  totalItems    = computed(() => this.filteredSorted().length);
  totalCost     = computed(() => this.filteredSorted().reduce((sum: number, it: any) => sum + (Number(it.cost) || 0), 0));
  expSoonCount  = computed(() => this.filteredSorted().filter(it => this.isExpiringSoon(it as any)).length);
  expiredCount  = computed(() => this.filteredSorted().filter(it => this.isExpired(it as any)).length);

  // ---- UI actions ----
  toggleSort(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  askDelete(it: InventoryItem | any) {
    this.confirm.set({ id: this.getId(it), name: (it as any).ingredientName });
  }
  cancelDelete() { this.confirm.set(null); }

  performDelete() {
    const c = this.confirm(); if (!c) return;
    this.api.deleteMany(c.id).subscribe({
      next: () => { this.confirm.set(null); this.load(); },
      error: (err: any) => { this.confirm.set(null); alert(err?.message || 'Delete failed.'); }
    });
  }

  goAdd()  { this.router.navigate(['/inventory/add']); }
  goEdit(it: InventoryItem | any) { this.router.navigate(['/inventory/edit', this.getId(it)]); }
}