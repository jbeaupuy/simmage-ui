import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MdSidenav } from '@angular/material';

import { Subscription } from 'rxjs/Subscription';

import { UserService } from '../../shared/user.service';
import { DeviceService } from '../../device.service';

@Component({
  // no need:  selector: 'app-admin-center',
  templateUrl: 'admin-center.component.html',
  styleUrls: ['admin-center.component.css']
})
export class AdminCenterComponent implements OnInit, OnDestroy {

  @ViewChild(MdSidenav) sidenav: MdSidenav;

  private isMobile: boolean = false;
  private sub: Subscription;

  constructor(private user: UserService, public router: Router,
    private device: DeviceService) { }

  ngOnInit() {
    this.sub = this.device.deviceType$.subscribe(t => {
      this.isMobile = t === 'mobile';
      if (this.isMobile) {
        this.sidenav.mode = 'over';
        this.sidenav.close();
      } else {
        this.sidenav.mode = 'side';
        this.sidenav.open();
      }
    });
  }

  onLogout() {
    this.user.logout();
  }

  onMain() {
    this.router.navigate(['/']);
  }

  isUser(): boolean {
    return this.user.isUser();
  }

  onSidenavClicked() {
    if (this.isMobile) {
      this.sidenav.close();
    }
  }

  onDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
