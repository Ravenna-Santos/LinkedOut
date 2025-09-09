import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CompanyService, Empresa, Usuario } from './company.service';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-company',
  standalone: true,
  styleUrls: ['./company.component.css'],
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  // Template atualizado com *ngIf para controle de acesso visual
  template: `
    <section>
      <h2>Empresas Cadastradas</h2>

      <div class="filtros">
        <input type="text" [(ngModel)]="filtroNome" placeholder="Buscar por nome" />
        <input type="text" [(ngModel)]="filtroArea" placeholder="Buscar por área de atuação" />
      </div>

      <button class="novo-btn" (click)="mostrarFormulario = true" *ngIf="!mostrarFormulario && (authService.hasRole('ADMIN') || authService.hasRole('GESTOR'))">Nova Empresa</button>

      <ul>
        <li *ngFor="let empresa of empresasFiltradas" class="company-card">
          <div class="company-header">
            <h3>{{ empresa.nomeDaEmpresa }}</h3>
          </div>
          <div class="company-details">
            <p><strong>CNPJ:</strong> {{ empresa.cnpj }}</p>
            <p><strong>Telefone:</strong> {{ empresa.telefone || 'Não informado' }}</p>
            <p><strong>Área de Atuação:</strong> {{ empresa.areaDeAtuacao }}</p>
            <p><strong>Representante:</strong> {{ empresa.representanteDaEmpresaNome || 'Não informado' }}</p>
          </div>

          <div class="acoes">
            <button *ngIf="authService.getUserId() === empresa.representanteDaEmpresaId" (click)="publicarVaga(empresa.id)" class="btn-publicar">
              Publicar Vaga
            </button>

            <ng-container *ngIf="authService.hasRole('ADMIN') || authService.getUserId() === empresa.representanteDaEmpresaId">
              <button (click)="editarEmpresa(empresa)">Editar</button>
              <button (click)="excluirEmpresa(empresa.id)">Excluir</button>
            </ng-container>
          </div>
        </li>
      </ul>

      <p *ngIf="empresas.length > 0 && empresasFiltradas.length === 0">Nenhuma empresa encontrada com os filtros atuais.</p>
      <p *ngIf="empresas.length === 0">Nenhuma empresa cadastrada no momento.</p>

      <section *ngIf="mostrarFormulario">
        <h3>{{ empresaEditando ? 'Editar Empresa' : 'Cadastrar Empresa' }}</h3>
        <form [formGroup]="formEmpresa" (ngSubmit)="onSubmit()">
          <input type="text" formControlName="nomeDaEmpresa" placeholder="Nome da Empresa" />
          <input type="text" formControlName="cnpj" placeholder="CNPJ" />
          <input type="text" formControlName="telefone" placeholder="Telefone" />
          <input type="text" formControlName="areaDeAtuacao" placeholder="Área de Atuação" />

          <ng-container *ngIf="authService.hasRole('ADMIN')">
            <label for="representante">Representante:</label>
            <select id="representante" formControlName="representanteId">
              <option value="">Selecione um representante</option>
              <option *ngFor="let user of usuarios" [value]="user.id">{{ user.nome }}</option>
            </select>
          </ng-container>

          <div class="botoes-formulario">
            <button type="submit" [disabled]="formEmpresa.invalid">
              {{ empresaEditando ? 'Salvar' : 'Cadastrar' }}
            </button>
            <button type="button" (click)="cancelarCadastro()">Cancelar</button>
          </div>
        </form>
      </section>
    </section>
  `
})
export class CompanyComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  public authService = inject(AuthService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  usuarios: Usuario[] = [];
  empresas: Empresa[] = [];
  mostrarFormulario = false;
  empresaEditando: Empresa | null = null;
  filtroNome = '';
  filtroArea = '';

  formEmpresa: FormGroup = this.fb.group({
    nomeDaEmpresa: ['', Validators.required],
    cnpj: ['', Validators.required],
    telefone: [''],
    areaDeAtuacao: ['', Validators.required],
    representanteId: ['', Validators.required]
  });

  ngOnInit(): void {
    this.carregarEmpresas();
    if (this.authService.hasRole('ADMIN') || this.authService.hasRole('GESTOR')) {
      this.buscarUsuarios();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get empresasFiltradas(): Empresa[] {
    return this.empresas.filter(empresa => {
      const nomeOk = empresa.nomeDaEmpresa.toLowerCase().includes(this.filtroNome.toLowerCase());
      const areaOk = empresa.areaDeAtuacao.toLowerCase().includes(this.filtroArea.toLowerCase());
      return nomeOk && areaOk;
    });
  }

  buscarUsuarios() {
    this.companyService.getUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dados) => this.usuarios = dados,
        error: (erro) => console.error('Erro ao buscar usuários:', erro)
      });
  }

  carregarEmpresas() {
    this.companyService.getEmpresas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dados) => this.empresas = dados,
        error: (erro) => console.error('Erro ao carregar empresas:', erro)
      });
  }

  onSubmit(): void {
    if (this.formEmpresa.invalid) return;

    // Se o usuário logado for GESTOR, o ID do representante é o dele mesmo
    const representanteId = this.authService.hasRole('GESTOR') && !this.authService.hasRole('ADMIN')
      ? this.authService.getUserId()
      : this.formEmpresa.value.representanteId;

    if (!representanteId) {
      alert('É necessário selecionar um representante.');
      return;
    }

    const formValue = this.formEmpresa.value;
    const empresaPayload = {
      nomeDaEmpresa: formValue.nomeDaEmpresa,
      cnpj: formValue.cnpj,
      telefone: formValue.telefone,
      areaDeAtuacao: formValue.areaDeAtuacao,
      representanteDaEmpresaId: representanteId
    };

    const action = this.empresaEditando
      ? this.companyService.updateEmpresa(this.empresaEditando.id, empresaPayload)
      : this.companyService.createEmpresa(empresaPayload);

    action.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        alert(`Empresa ${this.empresaEditando ? 'atualizada' : 'cadastrada'} com sucesso!`);
        this.cancelarCadastro();
        this.carregarEmpresas();
      },
      error: (error) => {
        console.error('Erro ao salvar empresa:', error);
        alert('Erro ao salvar empresa!');
      }
    });
  }

  cancelarCadastro() {
    this.formEmpresa.reset();
    this.mostrarFormulario = false;
    this.empresaEditando = null;
  }

  editarEmpresa(empresa: Empresa) {
    this.empresaEditando = empresa;
    this.mostrarFormulario = true;
    this.formEmpresa.patchValue({ // Usar patchValue para popular apenas os campos existentes
      nomeDaEmpresa: empresa.nomeDaEmpresa,
      cnpj: empresa.cnpj,
      telefone: empresa.telefone || '',
      areaDeAtuacao: empresa.areaDeAtuacao,
      representanteId: empresa.representanteDaEmpresaId
    });
  }

  excluirEmpresa(id: number) {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;

    this.companyService.deleteEmpresa(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert('Empresa excluída com sucesso!');
          this.carregarEmpresas();
        },
        error: (erro) => {
          console.error('Erro ao excluir empresa:', erro);
          alert('Erro ao excluir empresa!');
        }
      });
  }

  publicarVaga(companyId: number) {
    this.router.navigate(['/empresa', companyId, 'vaga', 'publicar']);
  }
}
