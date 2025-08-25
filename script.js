// DOM Elements
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const navToggle = document.getElementById("navToggle");
const closeSidebar = document.getElementById("closeSidebar");
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".section");
const activityForm = document.getElementById("activityForm");
const configForm = document.getElementById("configForm");
const photoUpload = document.getElementById("photoUpload");
const takePhotoBtn = document.getElementById("takePhotoBtn");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
const cameraPreview = document.getElementById("cameraPreview");
const cameraControls = document.getElementById("cameraControls");
const capturePhotoBtn = document.getElementById("capturePhotoBtn");
const cancelCameraBtn = document.getElementById("cancelCameraBtn");
const photoPreview = document.getElementById("photoPreview");
const createBackupBtn = document.getElementById("createBackup");
const restoreBackupBtn = document.getElementById("restoreBackup");
const clearDataBtn = document.getElementById("clearData");
const applyTableFiltersBtn = document.getElementById("applyTableFilters");
const activitiesTableBody = document.getElementById("activitiesTableBody");
const tableEmptyState = document.getElementById("tableEmptyState");
const reportPeriod = document.getElementById("reportPeriod");
const customDateRange = document.getElementById("customDateRange");
const customDateRangeEnd = document.getElementById("customDateRangeEnd");
const generateReportBtn = document.getElementById("generateReport");
const viewActivityModal = document.getElementById("viewActivityModal");
const photoModal = document.getElementById("photoModal");
const activityModalBody = document.getElementById("activityModalBody");
const photoModalBody = document.getElementById("photoModalBody");
const closeModalBtns = document.querySelectorAll(".close-modal");

// Global variables
let activities = JSON.parse(localStorage.getItem("activities")) || [];
let config = JSON.parse(localStorage.getItem("config")) || {};
let stream = null;
let capturedPhotos = [];

// Initialize the application
function init() {
  // Set current date and time
  const now = new Date();
  const formattedDateTime = now.toISOString().slice(0, 16);
  document.getElementById("activityDate").value = formattedDateTime;

  // Load configuration
  if (Object.keys(config).length > 0) {
    document.getElementById("employeeName").value = config.employeeName || "";
    document.getElementById("company").value = config.company || "";
    document.getElementById("department").value = config.department || "";
    document.getElementById("language").value = config.language || "pt-BR";
    document.getElementById("theme").value = config.theme || "light";

    // Update user avatar with initials
    if (config.employeeName) {
      const names = config.employeeName.split(" ");
      const initials =
        names[0].charAt(0) +
        (names.length > 1 ? names[names.length - 1].charAt(0) : "");
      document.getElementById("userAvatar").textContent = initials;
    }
  }

  // Load activities table
  updateActivitiesTable();

  // Update dashboard
  updateDashboard();

  // Set up event listeners
  setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
  // Navigation
  navToggle.addEventListener("click", toggleSidebar);
  closeSidebar.addEventListener("click", toggleSidebar);
  overlay.addEventListener("click", toggleSidebar);

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      showSection(targetId);

      // Close sidebar on mobile after navigation
      if (window.innerWidth < 992) {
        toggleSidebar();
      }
    });
  });

  // Forms
  activityForm.addEventListener("submit", handleActivitySubmit);
  configForm.addEventListener("submit", handleConfigSubmit);

  // Photo handling
  uploadPhotoBtn.addEventListener("click", () => photoUpload.click());
  photoUpload.addEventListener("change", handlePhotoUpload);
  takePhotoBtn.addEventListener("click", startCamera);
  capturePhotoBtn.addEventListener("click", capturePhoto);
  cancelCameraBtn.addEventListener("click", stopCamera);

  // Backup and restore
  createBackupBtn.addEventListener("click", createBackup);
  restoreBackupBtn.addEventListener("click", restoreBackup);
  clearDataBtn.addEventListener("click", clearAllData);

  // Table filters
  applyTableFiltersBtn.addEventListener("click", updateActivitiesTable);

  // Report filters
  reportPeriod.addEventListener("change", () => {
    if (reportPeriod.value === "custom") {
      customDateRange.style.display = "block";
      customDateRangeEnd.style.display = "block";
    } else {
      customDateRange.style.display = "none";
      customDateRangeEnd.style.display = "none";
    }
  });

  generateReportBtn.addEventListener("click", generateReport);

  // Modal close buttons
  closeModalBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      viewActivityModal.classList.remove("active");
      photoModal.classList.remove("active");
    });
  });
}

// Toggle sidebar visibility
function toggleSidebar() {
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
}

// Show specific section
function showSection(sectionId) {
  sections.forEach((section) => {
    section.classList.remove("active");
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
  });

  document.getElementById(sectionId).classList.add("active");
  document.querySelector(`a[href="#${sectionId}"]`).classList.add("active");

  // Special handling for certain sections
  if (sectionId === "atividades") {
    updateActivitiesTable();
  } else if (sectionId === "dashboard") {
    updateDashboard();
  }
}

// Handle activity form submission
function handleActivitySubmit(e) {
  e.preventDefault();

  const activityType = document.getElementById("activityType").value;
  const productionQty = parseInt(
    document.getElementById("productionQty").value
  );
  const lossQty = parseInt(document.getElementById("lossQty").value);
  const lossType = document.getElementById("lossType").value;
  const activityDate = document.getElementById("activityDate").value;
  const activityNotes = document.getElementById("activityNotes").value;

  // Get employee name from config
  const employeeName = config.employeeName || "Colaborador não identificado";

  // Create activity object
  const activity = {
    id: Date.now(),
    type: activityType,
    production: productionQty,
    loss: lossQty,
    lossType: lossType,
    date: activityDate,
    notes: activityNotes,
    photos: capturedPhotos,
    employee: employeeName,
    timestamp: new Date().toISOString(),
  };

  // Add to activities array
  activities.push(activity);

  // Save to localStorage
  localStorage.setItem("activities", JSON.stringify(activities));

  // Reset form and captured photos
  activityForm.reset();
  capturedPhotos = [];
  photoPreview.innerHTML = "";

  // Set current date and time
  const now = new Date();
  const formattedDateTime = now.toISOString().slice(0, 16);
  document.getElementById("activityDate").value = formattedDateTime;

  // Show success message
  showToast("Atividade registrada com sucesso!");

  // Update dashboard and activities table
  updateDashboard();
}

// Handle config form submission
function handleConfigSubmit(e) {
  e.preventDefault();

  // Get form values
  config.employeeName = document.getElementById("employeeName").value;
  config.company = document.getElementById("company").value;
  config.department = document.getElementById("department").value;
  config.language = document.getElementById("language").value;
  config.theme = document.getElementById("theme").value;

  // Save to localStorage
  localStorage.setItem("config", JSON.stringify(config));

  // Update user avatar with initials
  if (config.employeeName) {
    const names = config.employeeName.split(" ");
    const initials =
      names[0].charAt(0) +
      (names.length > 1 ? names[names.length - 1].charAt(0) : "");
    document.getElementById("userAvatar").textContent = initials;
  }

  // Show success message
  showToast("Configurações salvas com sucesso!");
}

// Handle photo upload
function handlePhotoUpload(e) {
  const files = e.target.files;

  if (files.length > 0) {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();

        reader.onload = function (e) {
          capturedPhotos.push(e.target.result);
          renderPhotoPreviews();
        };

        reader.readAsDataURL(file);
      }
    });
  }
}

// Start camera for taking photos
function startCamera() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(function (mediaStream) {
        stream = mediaStream;
        cameraPreview.srcObject = mediaStream;
        cameraPreview.style.display = "block";
        cameraControls.style.display = "flex";
        takePhotoBtn.style.display = "none";
        uploadPhotoBtn.style.display = "none";
      })
      .catch(function (error) {
        console.error("Error accessing camera:", error);
        showToast("Não foi possível acessar a câmera.");
      });
  } else {
    showToast("Seu navegador não suporta acesso à câmera.");
  }
}

// Stop camera
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  cameraPreview.style.display = "none";
  cameraControls.style.display = "none";
  takePhotoBtn.style.display = "block";
  uploadPhotoBtn.style.display = "block";
}

// Capture photo from camera
function capturePhoto() {
  const canvas = document.createElement("canvas");
  canvas.width = cameraPreview.videoWidth;
  canvas.height = cameraPreview.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg");
  capturedPhotos.push(dataUrl);

  renderPhotoPreviews();
  stopCamera();
}

// Render photo previews
function renderPhotoPreviews() {
  photoPreview.innerHTML = "";

  capturedPhotos.forEach((photo, index) => {
    const img = document.createElement("img");
    img.src = photo;
    img.className = "photo-thumbnail";
    img.addEventListener("click", () => viewPhoto(photo));

    photoPreview.appendChild(img);
  });
}

// View photo in modal
function viewPhoto(photoData) {
  photoModalBody.innerHTML = `<img src="${photoData}" style="width: 100%; border-radius: 8px;">`;
  photoModal.classList.add("active");
}

// Update activities table
function updateActivitiesTable() {
  const filterDate = document.getElementById("tableFilterDate").value;
  const filterType = document.getElementById("tableFilterType").value;
  const filterLoss = document.getElementById("tableFilterLoss").value;

  let filteredActivities = [...activities];

  // Apply filters
  if (filterDate) {
    filteredActivities = filteredActivities.filter((activity) => {
      return activity.date.startsWith(filterDate);
    });
  }

  if (filterType) {
    filteredActivities = filteredActivities.filter((activity) => {
      return activity.type === filterType;
    });
  }

  if (filterLoss === "with") {
    filteredActivities = filteredActivities.filter((activity) => {
      return activity.loss > 0;
    });
  } else if (filterLoss === "without") {
    filteredActivities = filteredActivities.filter((activity) => {
      return activity.loss === 0;
    });
  }

  // Sort by date (newest first)
  filteredActivities.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Clear table body
  activitiesTableBody.innerHTML = "";

  if (filteredActivities.length === 0) {
    tableEmptyState.style.display = "block";
    return;
  }

  tableEmptyState.style.display = "none";

  // Add rows to table
  filteredActivities.forEach((activity) => {
    const row = document.createElement("tr");

    const date = new Date(activity.date);
    const formattedDate = date.toLocaleDateString("pt-BR");
    const formattedTime = date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    row.innerHTML = `
                    <td>${formattedDate} ${formattedTime}</td>
                    <td>${activity.type}</td>
                    <td>${activity.production}</td>
                    <td>${
                      activity.loss > 0
                        ? `${activity.loss} (${activity.lossType})`
                        : "Nenhuma"
                    }</td>
                    <td>${activity.employee}</td>
                    <td class="table-actions">
                        <button class="btn btn-outline table-action-btn view-activity" data-id="${
                          activity.id
                        }">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                `;

    activitiesTableBody.appendChild(row);
  });

  // Add event listeners to view buttons
  document.querySelectorAll(".view-activity").forEach((btn) => {
    btn.addEventListener("click", () => {
      const activityId = parseInt(btn.getAttribute("data-id"));
      viewActivity(activityId);
    });
  });
}

// View activity details
function viewActivity(activityId) {
  const activity = activities.find((a) => a.id === activityId);

  if (!activity) return;

  const date = new Date(activity.date);
  const formattedDate = date.toLocaleDateString("pt-BR");
  const formattedTime = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let photosHtml = "";
  if (activity.photos && activity.photos.length > 0) {
    photosHtml = `
                    <div class="activity-detail">
                        <div class="activity-detail-label">Fotos:</div>
                        <div class="photo-gallery">
                            ${activity.photos
                              .map(
                                (photo) => `
                                <div class="gallery-item">
                                    <img src="${photo}" onclick="viewPhoto('${photo}')">
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                `;
  }

  activityModalBody.innerHTML = `
                <div class="activity-detail">
                    <div class="activity-detail-label">Data e Hora:</div>
                    <div class="activity-detail-value">${formattedDate} às ${formattedTime}</div>
                </div>
                
                <div class="activity-detail">
                    <div class="activity-detail-label">Tipo de Atividade:</div>
                    <div class="activity-detail-value">${activity.type}</div>
                </div>
                
                <div class="activity-detail">
                    <div class="activity-detail-label">Quantidade Produzida:</div>
                    <div class="activity-detail-value">${
                      activity.production
                    }</div>
                </div>
                
                <div class="activity-detail">
                    <div class="activity-detail-label">Quantidade de Perda:</div>
                    <div class="activity-detail-value">${
                      activity.loss > 0
                        ? `${activity.loss} (${activity.lossType})`
                        : "Nenhuma perda"
                    }</div>
                </div>
                
                <div class="activity-detail">
                    <div class="activity-detail-label">Colaborador:</div>
                    <div class="activity-detail-value">${
                      activity.employee
                    }</div>
                </div>
                
                <div class="activity-detail">
                    <div class="activity-detail-label">Observações:</div>
                    <div class="activity-detail-value">${
                      activity.notes || "Nenhuma observação"
                    }</div>
                </div>
                
                ${photosHtml}
            `;

  viewActivityModal.classList.add("active");
}

// Update dashboard
function updateDashboard() {
  // Calculate stats
  const totalProduction = activities.reduce(
    (sum, activity) => sum + activity.production,
    0
  );
  const totalLosses = activities.reduce(
    (sum, activity) => sum + activity.loss,
    0
  );
  const efficiency =
    totalProduction > 0
      ? (((totalProduction - totalLosses) / totalProduction) * 100).toFixed(1)
      : 0;

  // Get today's activities count
  const today = new Date().toLocaleDateString("pt-BR");
  const activitiesToday = activities.filter((activity) => {
    const activityDate = new Date(activity.date).toLocaleDateString("pt-BR");
    return activityDate === today;
  }).length;

  // Update DOM elements
  document.getElementById("totalProduction").textContent = totalProduction;
  document.getElementById("totalLosses").textContent = totalLosses;
  document.getElementById("efficiency").textContent = `${efficiency}%`;
  document.getElementById("activitiesToday").textContent = activitiesToday;

  // Update incident list
  const incidentList = document.getElementById("incidentList");
  incidentList.innerHTML = "";

  // Get activities with losses (incidents)
  const incidents = activities
    .filter((activity) => activity.loss > 0)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (incidents.length === 0) {
    incidentList.innerHTML =
      '<li class="incident-item">Nenhum incidente registrado</li>';
    return;
  }

  incidents.forEach((activity) => {
    const date = new Date(activity.date);
    const formattedDate = date.toLocaleDateString("pt-BR");

    const li = document.createElement("li");
    li.className = "incident-item";
    li.innerHTML = `
                    <div>
                        <span class="incident-type">${activity.lossType}</span>
                        <p>${activity.type} - ${activity.loss} unidades perdidas</p>
                    </div>
                    <div class="incident-date">${formattedDate}</div>
                `;

    incidentList.appendChild(li);
  });

  // Update chart
  updateProductionChart();
}

// Update production chart
function updateProductionChart() {
  const ctx = document.getElementById("productionChart").getContext("2d");

  // Group activities by date
  const activitiesByDate = {};

  activities.forEach((activity) => {
    const date = new Date(activity.date).toLocaleDateString("pt-BR");

    if (!activitiesByDate[date]) {
      activitiesByDate[date] = {
        production: 0,
        loss: 0,
      };
    }

    activitiesByDate[date].production += activity.production;
    activitiesByDate[date].loss += activity.loss;
  });

  // Get last 7 days
  const dates = [];
  const productionData = [];
  const lossData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toLocaleDateString("pt-BR");

    dates.push(dateString);

    if (activitiesByDate[dateString]) {
      productionData.push(activitiesByDate[dateString].production);
      lossData.push(activitiesByDate[dateString].loss);
    } else {
      productionData.push(0);
      lossData.push(0);
    }
  }

  // Create or update chart
  if (window.productionChartInstance) {
    window.productionChartInstance.data.labels = dates;
    window.productionChartInstance.data.datasets[0].data = productionData;
    window.productionChartInstance.data.datasets[1].data = lossData;
    window.productionChartInstance.update();
  } else {
    window.productionChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: dates,
        datasets: [
          {
            label: "Produção",
            data: productionData,
            backgroundColor: "rgba(46, 204, 113, 0.7)",
            borderColor: "rgba(46, 204, 113, 1)",
            borderWidth: 1,
          },
          {
            label: "Perdas",
            data: lossData,
            backgroundColor: "rgba(231, 76, 60, 0.7)",
            borderColor: "rgba(231, 76, 60, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }
}

// Generate report
// Generate report
// Generate report
function generateReport() {
  const period = reportPeriod.value;
  const type = document.getElementById("reportType").value;
  let startDate, endDate;

  // Set date range based on period
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Fim do dia

  switch (period) {
    case "today":
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0); // Início do dia
      endDate = new Date(today);
      break;
    case "week":
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      break;
    case "month":
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      break;
    case "custom":
      const startInput = document.getElementById("startDate").value;
      const endInput = document.getElementById("endDate").value;

      if (!startInput || !endInput) {
        showToast(
          "Selecione ambas as datas para o período personalizado.",
          "warning"
        );
        return;
      }

      startDate = new Date(startInput);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endInput);
      endDate.setHours(23, 59, 59, 999);
      break;
  }

  // Filter activities
  let filteredActivities = activities.filter((activity) => {
    const activityDate = new Date(activity.date);
    return activityDate >= startDate && activityDate <= endDate;
  });

  if (type) {
    filteredActivities = filteredActivities.filter(
      (activity) => activity.type === type
    );
  }

  // Generate report preview
  const reportPreview = document.getElementById("reportPreview");

  if (filteredActivities.length === 0) {
    reportPreview.innerHTML = `
      <p>Nenhuma atividade encontrada para os filtros selecionados.</p>
      <p><strong>Período:</strong> ${startDate.toLocaleDateString(
        "pt-BR"
      )} a ${endDate.toLocaleDateString("pt-BR")}</p>
      <p><strong>Tipo:</strong> ${type || "Todos"}</p>
    `;
    return;
  }

  // Calculate totals
  const totalProduction = filteredActivities.reduce(
    (sum, activity) => sum + activity.production,
    0
  );
  const totalLoss = filteredActivities.reduce(
    (sum, activity) => sum + activity.loss,
    0
  );
  const efficiency =
    totalProduction > 0
      ? (((totalProduction - totalLoss) / totalProduction) * 100).toFixed(1)
      : 0;

  // Create report HTML
  let reportHtml = `
    <h4>Relatório de Atividades</h4>
    <p><strong>Período:</strong> ${startDate.toLocaleDateString(
      "pt-BR"
    )} a ${endDate.toLocaleDateString("pt-BR")}</p>
    <p><strong>Tipo:</strong> ${type || "Todos"}</p>
    <p><strong>Total de Produção:</strong> ${totalProduction}</p>
    <p><strong>Total de Perdas:</strong> ${totalLoss}</p>
    <p><strong>Eficiência:</strong> ${efficiency}%</p>
    <p><strong>Total de Registros:</strong> ${filteredActivities.length}</p>
    
    <table class="data-table">
        <thead>
            <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Produção</th>
                <th>Perdas</th>
                <th>Colaborador</th>
            </tr>
        </thead>
        <tbody>
  `;

  filteredActivities.forEach((activity) => {
    const date = new Date(activity.date);
    const formattedDate = date.toLocaleDateString("pt-BR");
    const formattedTime = date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    reportHtml += `
      <tr>
          <td>${formattedDate} ${formattedTime}</td>
          <td>${activity.type}</td>
          <td>${activity.production}</td>
          <td>${
            activity.loss > 0
              ? `${activity.loss} (${activity.lossType})`
              : "Nenhuma"
          }</td>
          <td>${activity.employee}</td>
      </tr>
    `;
  });

  reportHtml += `
      </tbody>
    </table>
    
    <div style="margin-top: 20px;">
        <button class="btn btn-success" id="exportPdf">
            <i class="fas fa-file-pdf"></i> Exportar como PDF
        </button>
    </div>
  `;

  reportPreview.innerHTML = reportHtml;

  // Add event listener to export button
  document.getElementById("exportPdf").addEventListener("click", () => {
    exportToPdf(filteredActivities, startDate, endDate, type);
  });
}

// Export to PDF function
// Export to PDF function with improved layout
async function exportToPdf(activities, startDate, endDate, type) {
  try {
    // Initialize PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Set document properties
    doc.setProperties({
      title: "Relatório de Atividades - Work Manager",
      subject: `Relatório de ${startDate.toLocaleDateString(
        "pt-BR"
      )} a ${endDate.toLocaleDateString("pt-BR")}`,
      author: config.employeeName || "Work Manager",
      creator: "Work Manager Profissional",
    });

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("Relatório de Atividades", 105, 20, { align: "center" });

    // Add period information
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Período: ${startDate.toLocaleDateString(
        "pt-BR"
      )} a ${endDate.toLocaleDateString("pt-BR")}`,
      14,
      30
    );

    // Add filters information
    doc.text(`Tipo: ${type || "Todos"}`, 14, 37);

    // Calculate totals
    const totalProduction = activities.reduce(
      (sum, activity) => sum + activity.production,
      0
    );
    const totalLoss = activities.reduce(
      (sum, activity) => sum + activity.loss,
      0
    );
    const efficiency =
      totalProduction > 0
        ? (((totalProduction - totalLoss) / totalProduction) * 100).toFixed(1)
        : 0;

    // Add summary
    doc.text(`Total de Produção: ${totalProduction}`, 14, 44);
    doc.text(`Total de Perdas: ${totalLoss}`, 14, 51);
    doc.text(`Eficiência: ${efficiency}%`, 14, 58);
    doc.text(`Total de Registros: ${activities.length}`, 14, 65);

    // Add generated date
    const now = new Date();
    doc.text(
      `Relatório gerado em: ${now.toLocaleDateString(
        "pt-BR"
      )} às ${now.toLocaleTimeString("pt-BR")}`,
      14,
      72
    );

    // Add company/employee info if available
    if (config.company || config.employeeName) {
      let companyInfo = "";
      if (config.company && config.employeeName) {
        companyInfo = `${config.company} - ${config.employeeName}`;
      } else if (config.company) {
        companyInfo = config.company;
      } else if (config.employeeName) {
        companyInfo = config.employeeName;
      }
      doc.text(companyInfo, 105, 79, { align: "center" });
    }

    // Add table header
    doc.setFillColor(52, 152, 219);
    doc.setTextColor(255, 255, 255);
    doc.rect(14, 85, 182, 10, "F");

    // Table headers
    doc.text("Data/Hora", 25, 91);
    doc.text("Tipo", 65, 91);
    doc.text("Produção", 105, 91);
    doc.text("Perdas", 135, 91);
    doc.text("Colaborador", 165, 91);

    // Add table rows
    let yPosition = 100;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    // First, add all activities to the table without photos
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const date = new Date(activity.date);
      const formattedDate = date.toLocaleDateString("pt-BR");
      const formattedTime = date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;

        // Add table header on new page
        doc.setFontSize(12);
        doc.setFillColor(52, 152, 219);
        doc.setTextColor(255, 255, 255);
        doc.rect(14, 10, 182, 10, "F");
        doc.text("Data/Hora", 25, 16);
        doc.text("Tipo", 65, 16);
        doc.text("Produção", 105, 16);
        doc.text("Perdas", 135, 16);
        doc.text("Colaborador", 165, 16);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        yPosition = 25;
      }

      // Add row data
      doc.text(`${formattedDate} ${formattedTime}`, 25, yPosition);
      doc.text(activity.type, 65, yPosition);
      doc.text(activity.production.toString(), 105, yPosition);
      doc.text(
        activity.loss > 0
          ? `${activity.loss} (${activity.lossType})`
          : "Nenhuma",
        135,
        yPosition
      );
      doc.text(activity.employee, 165, yPosition);

      yPosition += 7;

      // Add separator line
      doc.setDrawColor(200, 200, 200);
      doc.line(14, yPosition, 196, yPosition);
      yPosition += 5;
    }

    // Now add a new section for photos
    const activitiesWithPhotos = activities.filter(
      (activity) => activity.photos && activity.photos.length > 0
    );

    if (activitiesWithPhotos.length > 0) {
      // Add a new page for photos
      doc.addPage();

      // Add photos section title
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text("Fotos das Atividades", 105, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Período: ${startDate.toLocaleDateString(
          "pt-BR"
        )} a ${endDate.toLocaleDateString("pt-BR")}`,
        14,
        30
      );

      let photoYPosition = 40;

      // Process each activity with photos
      for (let i = 0; i < activitiesWithPhotos.length; i++) {
        const activity = activitiesWithPhotos[i];
        const date = new Date(activity.date);
        const formattedDate = date.toLocaleDateString("pt-BR");
        const formattedTime = date.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // Add activity header
        doc.setFontSize(12);
        doc.setTextColor(52, 152, 219);
        doc.text(
          `Atividade: ${activity.type} - ${formattedDate} ${formattedTime}`,
          14,
          photoYPosition
        );
        doc.text(`Colaborador: ${activity.employee}`, 14, photoYPosition + 7);

        if (activity.notes) {
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          const splitNotes = doc.splitTextToSize(
            `Observações: ${activity.notes}`,
            180
          );
          doc.text(splitNotes, 14, photoYPosition + 15);
          photoYPosition += splitNotes.length * 5 + 5;
        } else {
          photoYPosition += 15;
        }

        doc.setTextColor(0, 0, 0);

        // Process each photo
        for (let j = 0; j < activity.photos.length; j++) {
          const photoData = activity.photos[j];

          // Check if we need a new page
          if (photoYPosition > 200) {
            doc.addPage();
            photoYPosition = 20;
          }

          try {
            // Add image with timestamp
            const imgWithTimestamp = await createImageWithTimestamp(
              photoData,
              `${formattedDate} ${formattedTime} - ${activity.employee}`
            );

            const img = new Image();
            img.src = imgWithTimestamp;

            await new Promise((resolve) => {
              img.onload = resolve;
            });

            // Add image to PDF (resized to fit)
            const maxWidth = 180;
            const maxHeight = 120;

            let imgWidth = img.width;
            let imgHeight = img.height;

            // Scale image if needed
            if (imgWidth > maxWidth) {
              const ratio = maxWidth / imgWidth;
              imgWidth = maxWidth;
              imgHeight = imgHeight * ratio;
            }

            if (imgHeight > maxHeight) {
              const ratio = maxHeight / imgHeight;
              imgHeight = maxHeight;
              imgWidth = imgWidth * ratio;
            }

            // Center image
            const xPosition = (210 - imgWidth) / 2;

            doc.addImage(
              imgWithTimestamp,
              "JPEG",
              xPosition,
              photoYPosition,
              imgWidth,
              imgHeight
            );

            photoYPosition += imgHeight + 15;
          } catch (error) {
            console.error("Error processing image:", error);
            doc.text("Erro ao processar imagem", 14, photoYPosition);
            photoYPosition += 10;
          }
        }

        // Add separator between activities
        doc.setDrawColor(200, 200, 200);
        doc.line(14, photoYPosition, 196, photoYPosition);
        photoYPosition += 10;
      }
    }

    // Save the PDF
    const fileName = `relatorio_${startDate.toISOString().split("T")[0]}_a_${
      endDate.toISOString().split("T")[0]
    }.pdf`;
    doc.save(fileName);

    showToast("PDF gerado com sucesso!");
  } catch (error) {
    console.error("Error generating PDF:", error);
    showToast("Erro ao gerar PDF: " + error.message, "error");
  }
}

// Function to create image with timestamp
// Function to create image with timestamp (improved)
// Function to create image with timestamp (improved visibility)
function createImageWithTimestamp(imageData, timestamp) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function () {
      // Create canvas with extra space for timestamp
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height + 40; // Extra space for timestamp
      const ctx = canvas.getContext("2d");

      // Draw the original image
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // Add background for timestamp
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, img.height, img.width, 40);

      // Add timestamp text (white with larger font)
      ctx.font = "bold 20px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(timestamp, img.width / 2, img.height + 20);

      // Convert to data URL
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.src = imageData;
  });
}

// Create backup
function createBackup() {
  try {
    // Create backup object
    const backupData = {
      activities: activities,
      config: config,
      timestamp: new Date().toISOString(),
    };

    // Convert to JSON
    const jsonData = JSON.stringify(backupData);

    // Create zip file
    const zip = new JSZip();
    zip.file("backup.json", jsonData);

    // Add photos to zip
    const imgFolder = zip.folder("photos");
    let photoCount = 0;

    activities.forEach((activity, activityIndex) => {
      if (activity.photos && activity.photos.length > 0) {
        activity.photos.forEach((photo, photoIndex) => {
          // Convert base64 to blob
          const base64Data = photo.split(",")[1];
          const blob = b64toBlob(base64Data, "image/jpeg");

          // Add to zip
          imgFolder.file(
            `activity_${activityIndex}_photo_${photoIndex}.jpg`,
            blob
          );
          photoCount++;
        });
      }
    });

    // Generate zip file
    zip.generateAsync({ type: "blob" }).then(function (content) {
      // Create download link
      const a = document.createElement("a");
      const date = new Date();
      const dateStr = date.toISOString().split("T")[0];
      a.href = URL.createObjectURL(content);
      a.download = `work_manager_backup_${dateStr}.zip`;
      a.click();

      showToast(`Backup criado com sucesso! ${photoCount} fotos incluídas.`);
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    showToast("Erro ao criar backup.");
  }
}

// Convert base64 to blob
function b64toBlob(b64Data, contentType, sliceSize) {
  contentType = contentType || "";
  sliceSize = sliceSize || 512;

  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

// Restore backup
function restoreBackup() {
  const fileInput = document.getElementById("backupFile");
  const file = fileInput.files[0];

  if (!file) {
    showToast("Selecione um arquivo de backup primeiro.");
    return;
  }

  if (!file.name.endsWith(".zip")) {
    showToast("O arquivo deve ser um backup ZIP válido.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const zip = new JSZip();

    zip
      .loadAsync(e.target.result)
      .then(function (contents) {
        // Find and read the backup.json file
        const backupFile = contents.file("backup.json");

        if (!backupFile) {
          throw new Error("Arquivo de backup não encontrado no ZIP.");
        }

        return backupFile.async("text");
      })
      .then(function (jsonData) {
        const backupData = JSON.parse(jsonData);

        // Restore data
        activities = backupData.activities || [];
        config = backupData.config || {};

        // Save to localStorage
        localStorage.setItem("activities", JSON.stringify(activities));
        localStorage.setItem("config", JSON.stringify(config));

        // Update UI
        init();

        showToast("Backup restaurado com sucesso!");
      })
      .catch(function (error) {
        console.error("Error restoring backup:", error);
        showToast("Erro ao restaurar backup: " + error.message);
      });
  };

  reader.readAsArrayBuffer(file);
}

// Clear all data
function clearAllData() {
  if (
    confirm(
      "Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita."
    )
  ) {
    localStorage.removeItem("activities");
    localStorage.removeItem("config");

    activities = [];
    config = {};

    init();

    showToast("Todos os dados foram removidos.");
  }
}

// Show toast notification
function showToast(message, type = "success") {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll(".toast");
  existingToasts.forEach((toast) => toast.remove());

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  // Set icon based on type
  let icon = "check-circle";
  if (type === "error") icon = "exclamation-circle";
  if (type === "warning") icon = "exclamation-triangle";

  toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;

  // Add to DOM
  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize the app
init();
