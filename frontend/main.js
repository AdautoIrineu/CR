let projectId = null;
const map = L.map('map').setView([-14.2, -51.9], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);
const drawnItems = new L.FeatureGroup().addTo(map);
map.addControl(new L.Control.Draw({ edit: { featureGroup: drawnItems }, draw: { marker: false, circle: false, circlemarker: false, polyline: false } }));

async function api(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function createProject() {
  const payload = {
    name: document.querySelector('#projectName').value,
    description: document.querySelector('#projectDescription').value
  };
  const project = await api('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  projectId = project.id;
  document.querySelector('#projectStatus').textContent = `Projeto criado: ${project.id}`;
}

document.querySelector('#createProject').addEventListener('click', createProject);

document.querySelector('#uploadAoi').addEventListener('click', async () => {
  if (!projectId) await createProject();
  const file = document.querySelector('#aoiFile').files[0];
  if (!file) throw new Error('Selecione um arquivo de AOI.');
  const form = new FormData();
  form.append('file', file);
  const aoi = await api(`/api/projects/${projectId}/aoi`, { method: 'POST', body: form });
  document.querySelector('#aoiStatus').textContent = `AOI: ${aoi.area_ha.toFixed(2)} ha, UTM EPSG:${aoi.utm_epsg}`;
});

map.on(L.Draw.Event.CREATED, async (event) => {
  if (!projectId) await createProject();
  drawnItems.clearLayers();
  drawnItems.addLayer(event.layer);
  const aoi = await api(`/api/projects/${projectId}/aoi/draw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event.layer.toGeoJSON())
  });
  document.querySelector('#aoiStatus').textContent = `AOI desenhada: ${aoi.area_ha.toFixed(2)} ha, UTM EPSG:${aoi.utm_epsg}`;
});

async function enqueue(path) {
  if (!projectId) throw new Error('Crie um projeto primeiro.');
  const job = await api(path, { method: 'POST' });
  document.querySelector('#jobStatus').textContent = JSON.stringify(job, null, 2);
  return job;
}

document.querySelector('#runAnalysis').addEventListener('click', async () => {
  await enqueue(`/api/projects/${projectId}/analysis`);
  await refreshOverlaps();
});

document.querySelector('#buildReports').addEventListener('click', () => enqueue(`/api/projects/${projectId}/reports`));

async function refreshOverlaps() {
  if (!projectId) return;
  const overlaps = await api(`/api/projects/${projectId}/overlaps`);
  document.querySelector('#overlaps').innerHTML = overlaps.map((item) => `
    <tr><td>${item.theme}</td><td>${item.source}</td><td>${item.layer_name}</td><td>${item.area_ha.toFixed(3)}</td><td>${item.percent_aoi.toFixed(2)}</td></tr>
  `).join('');
}
