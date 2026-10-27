import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { InventoryService } from '../../../services/inventory.service';

@Component({
  selector: 'app-view-inventory',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './view-inventory.html'
})
export class ViewInventoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(InventoryService);

  loading = signal(false);
  error   = signal<string | null>(null);
  item    = signal<any | null>(null); // <- expose "item"

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!id) { this.error.set('Missing id'); return; }

    this.loading.set(true);
    this.api.getOne(id).subscribe({
      next: (it) => { this.item.set(it); this.loading.set(false); },
      error: (err) => { this.error.set(err?.error?.message || 'Failed to load'); this.loading.set(false); }
    });
  }
}