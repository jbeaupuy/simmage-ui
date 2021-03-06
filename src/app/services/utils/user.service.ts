import { DbDossier } from './../../services/backend/db-models/organ';
import { UserLoginJson } from './../../services/backend/db-models/json';
import { DossiersService } from './../backend/dossiers.service';
import { PgService } from './../backend/pg.service';
import { UserData } from './../../data/user-data';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import '../../rxjs_operators';

/***************
 * UserService *
 ***************/
@Injectable()
export class UserService {

  public userData: UserData;

  public userDataState: BehaviorSubject<UserData>;

  constructor(public pg: PgService, public dossiers: DossiersService) {
    // Init data from local storage
    this.userData = UserData.buildFromLocalStorage();
    if (this.userData.loggedIn && this.userData.usergroupId > 0) {
      const req = {
        portals: {
          por_id: true,
          por_name: true
        },
        groups_dossiers: {
          grp_id: true,
          grp_name: true
        }
      };
      this.pg.pgcall('login/usergroup_json', {
        prm_ugr_id: this.userData.usergroupId,
        req: JSON.stringify(req)
      }).subscribe(ugr => {
        this.userData.setPortals(ugr.portals);
        this.userData.setGroups(ugr.groups_dossiers);
        this.reloadDossiers();
        this.propagate();
      });
    }

    // Start observable with initial value
    this.userDataState = new BehaviorSubject<UserData>(this.userData);

    this.listenBadTokens();
  }

  listenBadTokens() {
    this.pg.badTokenEvents.subscribe(() => {
      this.logout();
    });
  }

  login(login: string, password: string): Observable<any> {
    const req = {
      usr_token: true,
      usr_rights: true,
      usr_previous_connection_date: true,
      usr_previous_connection_ip: true,
      usergroup: {
        ugr_id: true,
        groups_dossiers: {
          grp_id: true,
          grp_name: true
        },
        portals: {
          por_id: true,
          por_name: true
        }
      },
      participant: {
        par_id: true,
        par_firstname: true,
        par_lastname: true
      }
    };
    return this.pg.pgcall(
      'login/user_login_json', {
        prm_login: login,
        prm_pwd: password,
        prm_rights: null,
        req: JSON.stringify(req)
      })
      .map((res: UserLoginJson) => {
        this.userData = new UserData(res);
        this.pg.setToken(res.usr_token);
        if (res.usergroup) {
          this.userData.setPortals(res.usergroup.portals);
          this.userData.setGroups(res.usergroup.groups_dossiers);
          this.reloadDossiers();
        }
        this.userData.login = login;
        this.userData.saveToLocalStorage();
        this.propagate();
        return {
          date: res.usr_previous_connection_date ? res.usr_previous_connection_date.substring(0, 16) : null,
          ip: res.usr_previous_connection_ip
        };
      });
  }

  logout() {
    this.userData.loggedIn = false;
    this.userData.selectedPorId = 0;
    this.userData.selectedGrpId = 0;
    this.userData.saveToLocalStorage();
    this.propagate();
  }

  isLoggedIn() {
    return this.userData.loggedIn;
  }

  propagate() {
    this.userDataState.next(this.userData);
  }

  public isAdmin() {
    return this.isLoggedIn() && this.userData.rights != null && this.userData.rights.length > 0;
  }

  public isUser() {
    return this.isLoggedIn() && this.userData.usergroupId > 0;
  }

  public hasRight(r: string): boolean {
    return this.userData.hasRight(r);
  }

  public selectPortal(porId: number) {
    this.userData.selectedPorId = porId;
    this.userData.saveToLocalStorage();
    this.propagate();
  }

  public selectGroup(grpId: number) {
    this.userData.selectedGrpId = grpId;
    this.userData.saveToLocalStorage();
    this.reloadDossiers();
    this.propagate();
  }

  public selectDossier(dosId: number) {
    this.userData.selectedDosId = dosId;
    this.userData.saveToLocalStorage();
    this.propagate();
  }

  public getUserListDemo() {
    return this.pg.pgcall('login/user_list_demo', null);
  }

  private reloadDossiers() {
    const indiv$ = this.dossiers.loadDossiers(false, false, this.userData.selectedGrpId, false);
    const group$ = this.dossiers.loadDossiers(true, false, this.userData.selectedGrpId, false);
    Observable.combineLatest(indiv$, group$, (indiv: DbDossier[], group: DbDossier[]) => ({ indiv, group }))
      .subscribe(p => {
        this.userData.setDossiers([...p.indiv, ...p.group]);
        this.propagate();
      });
  }
}
