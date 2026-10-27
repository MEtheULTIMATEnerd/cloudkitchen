// src/app/components/layout/footer/footer.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrls:  ['./footer.css']
})
export class FooterComponent {
  studentId = environment.studentId;
  year = new Date().getFullYear();
}