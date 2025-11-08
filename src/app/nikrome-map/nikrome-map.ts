import { Component, AfterViewInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Modal } from '../modal/modal';

declare const L: any;

interface RunnerData {
  headers: string[];
  data: string[][];
}

@Component({
  selector: 'app-nikrome-map',
  imports: [Modal],
  templateUrl: './nikrome-map.html',
  styleUrl: './nikrome-map.scss'
})
export class NikromeMap implements AfterViewInit {
  protected isModalOpen = false;
  protected modalTitle = '';
  protected modalHeaders: string[] = [];
  protected modalMenData: string[][] = [];
  protected modalWomenData: string[][] = [];

  private runnerData: RunnerData | null = null;
  private http = inject(HttpClient);

  ngAfterViewInit() {
    // Load runner data
    this.http.get<RunnerData>('/semi_ventoux.json').subscribe(data => {
      this.runnerData = data;
      this.initMap();
    });
  }

  private initMap() {
    const map = L.map('map', { zoomControl: true }).setView([44.17411920884436, 5.278666950029784], 5);

    // tile layer — OpenStreetMap (free). Respect attribution.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const arrivalIcon = L.icon({
      iconUrl: '/arrival.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
    const pointIcon = L.icon({
      iconUrl: '/point.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    const points = [
      { id: 1, lat: 44.115035157289384, lng: 5.240221668381498, title: "StEsteve", html: "PC1", checkpoint: "StEsteve", icon: pointIcon },
      { id: 2, lat: 44.150063522021, lng: 5.318259467280956, title: "ChReynard", html: "PC2", checkpoint: "ChReynard", icon: pointIcon },
      { id: 3, lat: 44.17411920884436, lng: 5.278666950029784, title: "Sommet", html: "Arrivée Semi 21km", checkpoint: "Sommet", icon: arrivalIcon },
    ];

    // add markers and popups, keep references if needed
    const markers = points.map(p => {
      const m = L.marker([p.lat, p.lng], { title: p.title, icon: p.icon }).addTo(map);
      const popup = L.popup({
        minWidth: 160,
        closeButton: false,
        autoClose: false,
        closeOnClick: false,
        className: 'compact-popup clickable-popup'
      }).setContent(p.html);

      m.bindPopup(popup).openPopup();

      return m;
    });

    // Draw route line following roads using OSRM routing service
    this.drawRouteAlongRoads(map, points);

    // fit map to markers with padding
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));

    // Add click event to popups after they're in the DOM
    setTimeout(() => {
      document.querySelectorAll('.leaflet-popup-content-wrapper').forEach((popupElement, index) => {
        popupElement.addEventListener('click', () => {
          const checkpoint = points[index].checkpoint;
          this.openModal(checkpoint);
        });
      });
    }, 100);
  }

  protected openModal(checkpoint: string) {
    if (!this.runnerData) return;

    const columnIndex = this.runnerData.headers.indexOf(checkpoint);
    const relevantHeaders = ['Nom', 'Temps', 'Class/Sx', 'Class/Cat', 'Vit.'];
    const headerIndices = relevantHeaders.map(h => this.runnerData!.headers.indexOf(h));
    const classSxIndex = this.runnerData.headers.indexOf('Class/Sx');

    headerIndices[1] = columnIndex;

    // Split data by gender
    const allData = this.runnerData.data.map(row =>
      headerIndices.map(idx => row[idx])
    );

    // Filter men (Class/Sx ends with "(M)")
    this.modalMenData = allData.filter((row, index) => {
      const originalRow = this.runnerData!.data[index];
      const classSx = originalRow[classSxIndex];
      return classSx && classSx.includes('(M)');
    });

    // Filter women (Class/Sx ends with "(F)")
    this.modalWomenData = allData.filter((row, index) => {
      const originalRow = this.runnerData!.data[index];
      const classSx = originalRow[classSxIndex];
      return classSx && classSx.includes('(F)');
    });

    // Count runners with a time at this checkpoint
    const totalRunners = this.runnerData.data.length;
    const runnersWithTime = this.runnerData.data.filter(row => {
      const checkpointData = row[columnIndex];
      return checkpointData && checkpointData.trim() !== '--';
    }).length;

    this.modalTitle = `${checkpoint} - ${runnersWithTime}/${totalRunners}`;
    this.modalHeaders = relevantHeaders;
    this.isModalOpen = true;
  }

  protected closeModal() {
    this.isModalOpen = false;
  }

  private async drawRouteAlongRoads(map: any, points: any[]) {
    // Build coordinates string for OSRM API
    const coords = points.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);

        // Draw the route
        L.polyline(coordinates, {
          color: '#2C3E50',
          weight: 4,
          opacity: 0.7,
          lineJoin: 'round'
        }).addTo(map);
      } else {
        console.error('Could not get route from OSRM');
        // Fallback to straight lines
        const routeCoordinates = points.map(p => [p.lat, p.lng]);
        L.polyline(routeCoordinates, {
          color: '#2C3E50',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 5',
          lineJoin: 'round'
        }).addTo(map);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      // Fallback to straight lines
      const routeCoordinates = points.map(p => [p.lat, p.lng]);
      L.polyline(routeCoordinates, {
        color: '#2C3E50',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 5',
        lineJoin: 'round'
      }).addTo(map);
    }
  }
}
