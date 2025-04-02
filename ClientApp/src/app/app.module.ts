import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import {CanvasComponent} from "./components/canvas/canvas.component";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { StarsComponent } from './components/stars/stars.component';
import { CloudsComponent } from './components/clouds/clouds.component';
import { HillsComponent } from './components/hills/hills.component';
import { TributeLayerComponent } from './components/tributelayer/tributelayer.component';
import { NewTributeComponent } from './components/newtribute/newtribute.component';
import { ViewtributeComponent } from './components/viewtribute/viewtribute.component';

@NgModule({
  declarations: [
    AppComponent,
    CanvasComponent,
    StarsComponent,
    CloudsComponent,
    HillsComponent,
    TributeLayerComponent,
    NewTributeComponent,
    ViewtributeComponent,
  ],
  imports: [
    BrowserModule.withServerTransition({appId: 'ng-cli-universal'}),
    HttpClientModule,
    FormsModule,
    RouterModule.forRoot([]),
    BrowserAnimationsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
