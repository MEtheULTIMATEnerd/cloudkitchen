import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpRequest } from '@angular/common/http'; // ✅ correct source

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges(); // triggers ngOnInit/loadStats()

    httpMock.expectOne((req: HttpRequest<any>) =>
      /\/api\/recipes-\d+$/.test(req.url)
    ).flush([]);

    httpMock.expectOne((req: HttpRequest<any>) =>
      /\/api\/inventory-json-\d+$/.test(req.url)
    ).flush([]);

    // Optional users endpoint:
    // httpMock.expectOne((req: HttpRequest<any>) =>
    //   /\/api\/users-\d+$/.test(req.url)
    // ).flush([]);

    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});