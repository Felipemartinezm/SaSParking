import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Supabase, Profile, CompanyArea, Visit } from '../../core/services/supabase';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private supabase = inject(Supabase);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  profile$ = this.supabase.currentProfile$;
  currentProfile: Profile | null = null;
  
  // Navigation Tabs: 'camiones', 'historico', 'usuarios', 'areas'
  currentTab = 'camiones';

  // State
  users: Profile[] = [];
  areas: CompanyArea[] = [];
  activeVisits: Visit[] = [];
  historicVisits: Visit[] = [];

  loadingData = false;
  errorMessage = '';
  successMessage = '';

  // Modals State
  showUserModal = false;
  showAreaModal = false;
  showVisitModal = false;
  showRequestModal = false;

  isEditingUser = false;
  
  modalUser: any = { id: '', full_name: '', username: '', email: '', password: '', role: 'Operario' };
  newAreaName = '';
  
  modalVisit: any = { driver_name: '', driver_dni: '', truck_plate: '', trailer_plate: '' };
  
  selectedVisitIdForRequest: string = '';
  requestTargetAreaId: string = '';

  modalLoading = false;

  ngOnInit() {
    this.supabase.currentProfile$.subscribe(p => {
      this.currentProfile = p;
      if (p) this.loadDataForTab();
      this.cdr.detectChanges();
    });
  }

  setTab(tab: string) {
    this.currentTab = tab;
    this.loadDataForTab();
  }

  async loadDataForTab() {
    this.loadingData = true;
    try {
      if (this.currentTab === 'usuarios' && this.currentProfile?.role === 'Admin') {
        const { data } = await this.supabase.getCompanyUsers();
        if (data) this.users = data as Profile[];
      } 
      else if (this.currentTab === 'areas') {
        const { data } = await this.supabase.getAreas();
        if (data) this.areas = data as CompanyArea[];
      }
      else if (this.currentTab === 'camiones') {
        const { data } = await this.supabase.getVisits(true);
        if (data) this.activeVisits = data as Visit[];
      }
      else if (this.currentTab === 'historico') {
        const { data } = await this.supabase.getVisits(false);
        if (data) this.historicVisits = data as Visit[];
      }
    } catch (e) {
      console.error(e);
    }
    this.loadingData = false;
    this.cdr.detectChanges();
  }

  showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3000);
  }

  showError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 5000);
  }

  // --- Users ---
  openCreateUserModal() {
    this.isEditingUser = false;
    this.modalUser = { id: '', full_name: '', username: '', email: '', password: '', role: 'Operario' };
    this.showUserModal = true;
  }
  openEditUserModal(user: Profile) {
    this.isEditingUser = true;
    this.modalUser = { ...user, email: '', password: '' };
    this.showUserModal = true;
  }
  async saveUser() {
    this.modalLoading = true;
    try {
      if (this.isEditingUser) {
        await this.supabase.updateTenantUser({
          target_user_id: this.modalUser.id,
          new_full_name: this.modalUser.full_name,
          new_username: this.modalUser.username,
          new_role: this.modalUser.role,
          new_password: this.modalUser.password || undefined
        });
        this.showSuccess('Usuario actualizado');
      } else {
        await this.supabase.createTenantUser({
          new_email: this.modalUser.email,
          new_password: this.modalUser.password,
          new_full_name: this.modalUser.full_name,
          new_username: this.modalUser.username,
          new_role: this.modalUser.role
        });
        this.showSuccess('Usuario creado');
      }
      this.showUserModal = false;
      this.loadDataForTab();
    } catch (err: any) {
      this.showError(err.message || 'Error');
    } finally {
      this.modalLoading = false;
    }
  }
  async deleteUser(id: string) {
    if (!confirm('¿Seguro?')) return;
    await this.supabase.deleteTenantUser(id);
    this.loadDataForTab();
  }

  // --- Areas ---
  async saveArea() {
    if (!this.newAreaName) return;
    this.modalLoading = true;
    try {
      await this.supabase.createArea(this.newAreaName);
      this.newAreaName = '';
      this.showAreaModal = false;
      this.showSuccess('Área creada');
      this.loadDataForTab();
    } catch (err: any) {
      this.showError('Error al crear área');
    } finally {
      this.modalLoading = false;
    }
  }
  async deleteArea(id: string) {
    if (!confirm('¿Eliminar esta área? Los registros históricos mantendrán el ID nulo.')) return;
    await this.supabase.deleteArea(id);
    this.loadDataForTab();
  }

  // --- Visits (Camiones) ---
  openCreateVisitModal() {
    this.modalVisit = { driver_name: '', driver_dni: '', truck_plate: '', trailer_plate: '' };
    this.showVisitModal = true;
  }
  async saveVisit() {
    this.modalLoading = true;
    try {
      await this.supabase.createVisit(this.modalVisit);
      this.showVisitModal = false;
      this.showSuccess('Camión registrado y en espera');
      this.loadDataForTab();
    } catch (err) {
      this.showError('Error al registrar visita');
    } finally {
      this.modalLoading = false;
    }
  }

  // Actions for Logistics Flow
  async openRequestModal(visit: Visit) {
    // Load areas if not loaded
    if (this.areas.length === 0) {
      const { data } = await this.supabase.getAreas();
      this.areas = (data as CompanyArea[]) || [];
    }
    this.selectedVisitIdForRequest = visit.id;
    this.requestTargetAreaId = '';
    this.showRequestModal = true;
  }

  async confirmRequest() {
    if (!this.requestTargetAreaId) return;
    this.modalLoading = true;
    try {
      await this.supabase.updateVisit(this.selectedVisitIdForRequest, {
        requested_area_id: this.requestTargetAreaId
      });
      this.showRequestModal = false;
      this.showSuccess('Camión solicitado exitosamente');
      this.loadDataForTab();
    } catch (err) {
      this.showError('Error');
    } finally {
      this.modalLoading = false;
    }
  }

  async actionDispatch(visitId: string) {
    // Operario Patio despacha
    try {
      await this.supabase.updateVisit(visitId, { status: 'En tránsito' });
      this.showSuccess('Camión en tránsito');
      this.loadDataForTab();
    } catch (err) {}
  }

  async actionReceive(visit: Visit) {
    // Operario recibe
    try {
      await this.supabase.updateVisit(visit.id, { 
        status: 'En área',
        current_area_id: visit.requested_area_id,
        requested_area_id: undefined
      });
      this.showSuccess('Camión recibido en área');
      this.loadDataForTab();
    } catch (err) {}
  }

  async actionFinalize(visitId: string) {
    try {
      await this.supabase.updateVisit(visitId, { status: 'Finalizado' });
      this.showSuccess('Visita finalizada');
      this.loadDataForTab();
    } catch (err) {}
  }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
