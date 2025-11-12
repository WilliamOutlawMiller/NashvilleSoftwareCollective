import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Structure } from './structure/structure';
import { Membership } from './membership/membership';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'structure', component: Structure },
  { path: 'membership', component: Membership },
  { path: '**', redirectTo: '' }
];
