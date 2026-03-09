import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Teacher {
  id?: number;
  name: string;
  qualification: string;
  subject: string;
  email: string;
  profileImage: string;
}

@Component({
  selector: 'app-teacher-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-form.component.html',
  styleUrls: ['./teacher-form.component.css']
})
export class TeacherFormComponent {
  @Input() isEditMode: boolean = false;
  @Input() teacherData: Teacher | null = null;
  @Output() formSubmit = new EventEmitter<Teacher>();
  @Output() formClose = new EventEmitter<void>();

  teacher: Teacher = {
    name: '',
    qualification: '',
    subject: '',
    email: '',
    profileImage: ''
  };

  emailUsername: string = '';
  profilePreview: string = 'https://via.placeholder.com/150/7c3aed/ffffff?text=Upload+Photo';

  ngOnInit() {
    if (this.teacherData) {
      this.teacher = { ...this.teacherData };
      this.profilePreview = this.teacher.profileImage || 'https://via.placeholder.com/150/7c3aed/ffffff?text=Upload+Photo';
      
      // Extract username from email if editing
      if (this.teacher.email && this.teacher.email.includes('@gmail.com')) {
        this.emailUsername = this.teacher.email.replace('@gmail.com', '');
      }
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.profilePreview = reader.result as string;
        this.teacher.profileImage = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // Name validation - no numbers allowed
  validateNameInput(event: KeyboardEvent): boolean {
    const char = String.fromCharCode(event.which);
    if (/[0-9]/.test(char)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  // Name input handler with capitalization
  onNameInput(event: any) {
    let value = event.target.value;
    
    // Remove any numbers
    value = value.replace(/[0-9]/g, '');
    
    // Capitalize first letter of each word
    value = value.replace(/\b\w/g, (char: string) => char.toUpperCase());
    
    this.teacher.name = value;
    event.target.value = value;
    
    this.updatePreview();
  }

  // Email input handler
  onEmailInput() {
    // Remove any spaces and convert to lowercase
    this.emailUsername = this.emailUsername.replace(/\s/g, '').toLowerCase();
    
    // Update the full email
    this.teacher.email = this.emailUsername + '@gmail.com';
  }

  updatePreview() {
    // Update preview based on name if no image is uploaded
    if (!this.teacher.profileImage && this.teacher.name) {
      this.profilePreview = this.getDefaultAvatarByGender(this.teacher.name);
    } else if (!this.teacher.profileImage) {
      this.profilePreview = 'https://via.placeholder.com/150/7c3aed/ffffff?text=Upload+Photo';
    }
  }

  getDefaultAvatarByGender(name: string): string {
    const femaleNames = [
      'aisha', 'fatima', 'khadija', 'zainab', 'mariam', 'ayesha', 'sara', 'hina', 'sana', 'nadia',
      'farah', 'rabia', 'samina', 'rubina', 'nasreen', 'shahida', 'bushra', 'farzana', 'shazia', 'tahira',
      'maria', 'aliya', 'sadia', 'fouzia', 'uzma', 'shama', 'razia', 'sultana', 'rashida', 'yasmeen',
      'amna', 'sidra', 'madiha', 'saima', 'nighat', 'parveen', 'shahnaz', 'riffat', 'naheed', 'shamim',
      'asma', 'hajra', 'maryam', 'sahar', 'noor', 'laiba', 'iqra', 'rimsha', 'arooj', 'mehwish',
      'sarah', 'emma', 'olivia', 'ava', 'isabella', 'sophia', 'mia', 'charlotte', 'amelia', 'harper'
    ];

    const maleNames = [
      'muhammad', 'ahmed', 'ali', 'hassan', 'hussain', 'omar', 'usman', 'ibrahim', 'yousuf', 'ismail',
      'tariq', 'khalid', 'rashid', 'salman', 'imran', 'shahid', 'naveed', 'asif', 'iqbal', 'zahid',
      'farhan', 'adnan', 'waqas', 'bilal', 'faisal', 'kamran', 'danish', 'junaid', 'hamza', 'zubair',
      'saeed', 'majid', 'nasir', 'akram', 'ashraf', 'anwar', 'pervez', 'riaz', 'shafiq', 'rafiq',
      'john', 'james', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles'
    ];

    const firstName = name.toLowerCase().split(' ')[0];
    
    if (femaleNames.includes(firstName)) {
      return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=f3e8ff&color=7c3aed&size=150&font-size=0.6&format=png&rounded=true';
    } else if (maleNames.includes(firstName)) {
      return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=dbeafe&color=3b82f6&size=150&font-size=0.6&format=png&rounded=true';
    } else {
      return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=f3f4f6&color=6b7280&size=150&font-size=0.6&format=png&rounded=true';
    }
  }

  onSubmit() {
    // Ensure email is properly set
    if (this.emailUsername) {
      this.teacher.email = this.emailUsername + '@gmail.com';
    }
    
    console.log('Form submission attempt:', this.teacher);
    
    if (this.teacher.name && this.teacher.qualification && this.teacher.subject && this.teacher.email) {
      console.log('Form validation passed, emitting teacher data:', this.teacher);
      alert('Form submitted successfully! Check the table.'); // Temporary debug
      this.formSubmit.emit(this.teacher);
      this.resetForm();
    } else {
      console.log('Form validation failed:', {
        name: this.teacher.name,
        qualification: this.teacher.qualification,
        subject: this.teacher.subject,
        email: this.teacher.email
      });
      alert('Form validation failed! Please fill all required fields.'); // Temporary debug
    }
  }

  closeForm() {
    this.formClose.emit();
    this.resetForm();
  }

  resetForm() {
    this.teacher = {
      name: '',
      qualification: '',
      subject: '',
      email: '',
      profileImage: ''
    };
    this.emailUsername = '';
    this.profilePreview = 'https://via.placeholder.com/150/7c3aed/ffffff?text=Upload+Photo';
  }
}
