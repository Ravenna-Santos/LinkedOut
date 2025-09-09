import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { StudentService, Estudante, Usuario } from './student.service';

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './student.component.html',
  styleUrls: ['./student.component.css']
})
export class StudentComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private studentService = inject(StudentService);
  public authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  usuarios: Usuario[] = [];
  estudantes: Estudante[] = [];
  mostrarFormulario = false;
  estudanteEditando: Estudante | null = null;

  filtroCurso = '';
  periodoMin: number | null = null;
  periodoMax: number | null = null;

  formEstudante: FormGroup = this.fb.group({
    nomeCompleto: ['', Validators.required],
    dataNascimento: ['', Validators.required],
    cpf: ['', Validators.required],
    telefone: [''],
    curso: ['', Validators.required],
    periodoAtual: ['', [Validators.required, Validators.min(1)]],
    resumoAcademico: ['', Validators.required],
    userId: [null]
  });

  ngOnInit(): void {
    this.carregarEstudantes();
    if (this.authService.hasRole('ADMIN')) {
      this.buscarUsuarios();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buscarUsuarios() {
    this.studentService.getUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dados) => this.usuarios = dados,
        error: (erro) => console.error('Erro ao buscar usuários:', erro)
      });
  }

  get estudantesFiltrados(): Estudante[] {
    return this.estudantes.filter(estudante => {
      const cursoOk = estudante.curso.toLowerCase().includes(this.filtroCurso.toLowerCase());
      const periodo = estudante.periodoAtual;
      const periodoMinOk = this.periodoMin === null || periodo >= this.periodoMin;
      const periodoMaxOk = this.periodoMax === null || periodo <= this.periodoMax;
      return cursoOk && periodoMinOk && periodoMaxOk;
    });
  }

  carregarEstudantes() {
    this.studentService.getEstudantes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dados) => this.estudantes = dados,
        error: (erro) => console.error('Erro ao carregar estudantes:', erro)
      });
  }

  onSubmit(): void {
    if (this.formEstudante.invalid) return;

    let userIdParaPayload = this.authService.getUserId();
    if (this.authService.hasRole('ADMIN') && !this.estudanteEditando) {
      if (!this.formEstudante.value.userId) {
        alert('Como administrador, você deve selecionar um usuário para criar o perfil de estudante.');
        return;
      }
      userIdParaPayload = this.formEstudante.value.userId;
    }

    const formValue = this.formEstudante.value;
    const estudantePayload = {
      fullName: formValue.nomeCompleto,
      birthDate: formValue.dataNascimento,
      cpf: formValue.cpf,
      phone: formValue.telefone,
      course: formValue.curso,
      currentPeriod: formValue.periodoAtual,
      academicSummary: formValue.resumoAcademico,
      userId: userIdParaPayload
    };

    const action = this.estudanteEditando
      ? this.studentService.updateEstudante(this.estudanteEditando.id, estudantePayload)
      : this.studentService.createEstudante(estudantePayload);

    action.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        alert(`Perfil de estudante ${this.estudanteEditando ? 'atualizado' : 'cadastrado'} com sucesso!`);
        this.cancelarCadastro();
        this.carregarEstudantes();
        if (!this.estudanteEditando && !this.authService.hasRole('ADMIN')) {
          window.location.reload();
        }
      },
      error: (error) => {
        console.error('Erro ao salvar perfil:', error);
        alert(`Erro ao salvar perfil: ${error.error?.message || 'Ocorreu um problema.'}`);
      }
    });
  }

  editarEstudante(estudante: Estudante) {
    this.estudanteEditando = estudante;
    this.mostrarFormulario = true;
    this.formEstudante.patchValue({
      nomeCompleto: estudante.nomeCompleto,
      dataNascimento: estudante.dataNascimento,
      cpf: estudante.cpf,
      telefone: estudante.telefone || '',
      curso: estudante.curso,
      periodoAtual: estudante.periodoAtual,
      resumoAcademico: estudante.resumoAcademico,
    });
  }

  excluirEstudante(id: number) {
    if (!confirm('Deseja excluir este perfil de estudante? A ação não pode ser desfeita.')) return;

    this.studentService.deleteEstudante(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert('Perfil excluído com sucesso!');
          this.carregarEstudantes();
        },
        error: (erro) => console.error('Erro ao excluir perfil:', erro)
      });
  }

  cancelarCadastro() {
    this.formEstudante.reset();
    this.mostrarFormulario = false;
    this.estudanteEditando = null;
  }

  abrirFormularioCadastro() {
    this.estudanteEditando = null;
    this.formEstudante.reset();
    this.mostrarFormulario = true;
  }
}
