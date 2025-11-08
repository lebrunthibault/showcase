import { Routes } from '@angular/router';
import { Home } from './home/home';
import { NikromeMap } from './nikrome-map/nikrome-map';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'nikrome-map', component: NikromeMap }
];
