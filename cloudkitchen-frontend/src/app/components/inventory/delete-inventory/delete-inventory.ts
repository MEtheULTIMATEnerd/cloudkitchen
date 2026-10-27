import { Component } from '@angular/core';

@Component({
  selector: 'app-delete-inventory',
  standalone: true,
  template: `
    <div class="container mt-3">
      <h2>Delete Inventory Item</h2>
      <p>This will allow the user to confirm and delete an inventory item.</p>
    </div>
  `
})
export class DeleteInventoryComponent {}