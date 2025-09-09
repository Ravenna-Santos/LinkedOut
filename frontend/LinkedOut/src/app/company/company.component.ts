import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { FormsModule } from '@angular/forms';

interface Usuario {
  id: number;
  nome: string;
}

interface Empresa {
  id: number;
  nomeDaEmpresa: string;
  cnpj: string;
  telefone?: string;
  areaDeAtuacao: string;
  representanteDaEmpresa: { id: number; nome?: string };
}

@Component({
  selector: 'app-company',
  standalone: true,
  styleUrls: ['./company.component.css'],
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, FormsModule],
  template: `
    <section>
      <h2>Empresas</h2>

      <div style="margin: 10px 0;">
        <input type="text" [(ngModel)]="filtroNome" placeholder="Buscar por nome" />
        <input type="text" [(ngModel)]="filtroArea" placeholder="Buscar por área de atuação" />
      </div>

      <button (click)="mostrarFormulario = true" *ngIf="!mostrarFormulario">Nova Empresa</button>

      <ul *ngIf="empresasFiltradas.length > 0">
        <li *ngFor="let empresa of empresasFiltradas">
          <strong>{{ empresa.nomeDaEmpresa }}</strong> - {{ empresa.cnpj }} -
          Representante: {{ empresa.representanteDaEmpresa.nome || empresa.representanteDaEmpresa.id }}

          <button (click)="editarEmpresa(empresa)">Editar</button>
          <button (click)="excluirEmpresa(empresa.id)">Excluir</button>
        </li>
      </ul>

      <p *ngIf="empresasFiltradas.length === 0">Nenhuma empresa encontrada com esses filtros.</p>

      <section *ngIf="mostrarFormulario" style="margin-top: 20px;">
        <h3>{{ empresaEditando ? 'Editar Empresa' : 'Cadastrar Empresa' }}</h3>
        <form [formGroup]="formEmpresa" (ngSubmit)="onSubmit()">

          <input type="text" formControlName="nomeDaEmpresa" placeholder="Nome da Empresa" />
          <input type="text" formControlName="cnpj" placeholder="CNPJ" />
          <input type="text" formControlName="telefone" placeholder="Telefone" />
          <input type="text" formControlName="areaDeAtuacao" placeholder="Área de Atuação" />

          <label for="representante">Representante:</label>
          <select id="representante" formControlName="representanteId">
            <option value="">Selecione um representante</option>
            <option *ngFor="let user of usuarios" [value]="user.id">{{ user.nome }}</option>
          </select>

          <button type="submit" [disabled]="formEmpresa.invalid">
            {{ empresaEditando ? 'Salvar' : 'Cadastrar' }}
          </button>
          <button type="button" (click)="cancelarCadastro()">Cancelar</button>
        </form>
      </section>
    </section>
  `
})
export class CompanyComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

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
    this.buscarUsuarios();
    this.carregarEmpresas();
  }

  private getHeaders() {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  get empresasFiltradas(): Empresa[] {
    return this.empresas.filter(empresa => {
      const nomeOk = empresa.nomeDaEmpresa.toLowerCase().includes(this.filtroNome.toLowerCase());
      const areaOk = empresa.areaDeAtuacao.toLowerCase().includes(this.filtroArea.toLowerCase());
      return nomeOk && areaOk;
    });
  }

  buscarUsuarios() {
    this.http.get<Usuario[]>('http://localhost:8080/users', { headers: this.getHeaders() })
      .subscribe({
        next: (dados) => this.usuarios = dados,
        error: (erro) => console.error('Erro ao buscar usuários:', erro)
      });
  }

  carregarEmpresas() {
    this.http.get<Empresa[]>('http://localhost:8080/company/list', { headers: this.getHeaders() })
      .subscribe({
        next: (dados) => this.empresas = dados,
        error: (erro) => console.error('Erro ao carregar empresas:', erro)
      });
  }

  async onSubmit(): Promise<void> {
    if (this.formEmpresa.invalid) return;

    const formValue = this.formEmpresa.value;

    const empresaPayload = {
      nomeDaEmpresa: formValue.nomeDaEmpresa,
      cnpj: formValue.cnpj,
      telefone: formValue.telefone,
      areaDeAtuacao: formValue.areaDeAtuacao,
      representanteDaEmpresaId: formValue.representanteId
    };

    try {
      if (this.empresaEditando) {
        await this.http.put(`http://localhost:8080/company/update/${this.empresaEditando.id}`, empresaPayload, { headers: this.getHeaders() }).toPromise();
        alert('Empresa atualizada com sucesso!');
      } else {
        await this.http.post('http://localhost:8080/company/create', empresaPayload, { headers: this.getHeaders() }).toPromise();
        alert('Empresa cadastrada com sucesso!');
      }

      this.formEmpresa.reset();
      this.mostrarFormulario = false;
      this.empresaEditando = null;
      this.carregarEmpresas();
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      alert('Erro ao salvar empresa!');
    }
  }

  cancelarCadastro() {
    this.formEmpresa.reset();
    this.mostrarFormulario = false;
    this.empresaEditando = null;
  }

  editarEmpresa(empresa: Empresa) {
    this.empresaEditando = empresa;
    this.mostrarFormulario = true;

    this.formEmpresa.setValue({
      nomeDaEmpresa: empresa.nomeDaEmpresa,
      cnpj: empresa.cnpj,
      telefone: empresa.telefone || '',
      areaDeAtuacao: empresa.areaDeAtuacao,
      representanteId: empresa.representanteDaEmpresa.id
    });
  }

  excluirEmpresa(id: number) {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;

    this.http.delete(`http://localhost:8080/company/delete/${id}`, { headers: this.getHeaders() })
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
}
