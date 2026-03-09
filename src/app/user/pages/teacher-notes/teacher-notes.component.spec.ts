import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherNotesComponent } from './teacher-notes.component';

describe('TeacherNotesComponent', () => {
  let component: TeacherNotesComponent;
  let fixture: ComponentFixture<TeacherNotesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherNotesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeacherNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
