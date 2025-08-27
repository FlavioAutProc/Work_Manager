// script.js código criado pelo DeepSeek Flávio Estrutura mais detalhada:
// DOM Elements (mantido igual)
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
let db = null;
let activities = [];
let config = {};
let stream = null;
let capturedPhotos = [];

// IndexedDB setup
const DB_NAME = "WorkManagerDB";
const DB_VERSION = 1;
const ACTIVITIES_STORE = "activities";
const CONFIG_STORE = "config";

// Initialize the application
async function init() {
  try {
    // Initialize IndexedDB
    await initIndexedDB();

    // Load data from IndexedDB
    await loadData();

    // Set current date and time
    const now = new Date();
    const formattedDateTime = now.toISOString().slice(0, 16);
    document.getElementById("activityDate").value = formattedDateTime;

    // Update UI with loaded config
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

    // Check storage status
    setTimeout(async () => {
      const storageUsage = await checkStorageStatus();
      if (storageUsage > 0.9) {
        showToast(
          "Seu armazenamento está quase cheio. Considere fazer backup.",
          "warning"
        );
      }
    }, 2000);
  } catch (error) {
    console.error("Error initializing application:", error);
    showToast("Erro ao inicializar o aplicativo", "error");
  }
}

// Initialize IndexedDB
function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create activities store if it doesn't exist
      if (!db.objectStoreNames.contains(ACTIVITIES_STORE)) {
        const activitiesStore = db.createObjectStore(ACTIVITIES_STORE, {
          keyPath: "id",
          autoIncrement: false,
        });
        activitiesStore.createIndex("date", "date", { unique: false });
        activitiesStore.createIndex("type", "type", { unique: false });
      }

      // Create config store if it doesn't exist
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE, { keyPath: "id" });
      }
    };
  });
}

// Load data from IndexedDB
async function loadData() {
  try {
    // Load activities
    activities = await getAllActivities();

    // Load config
    const configData = await getConfig();
    config = configData || {};
  } catch (error) {
    console.error("Error loading data:", error);
    throw error;
  }
}

// Get all activities from IndexedDB
function getAllActivities() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction([ACTIVITIES_STORE], "readonly");
    const store = transaction.objectStore(ACTIVITIES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Get config from IndexedDB
function getConfig() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction([CONFIG_STORE], "readonly");
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.get("userConfig");

    request.onsuccess = () => {
      resolve(request.result ? request.result.data : {});
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Save config to IndexedDB
function saveConfig(configData) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction([CONFIG_STORE], "readwrite");
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.put({ id: "userConfig", data: configData });

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Save activity to IndexedDB
function saveActivity(activity) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction([ACTIVITIES_STORE], "readwrite");
    const store = transaction.objectStore(ACTIVITIES_STORE);
    const request = store.add(activity);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Update activity in IndexedDB
function updateActivity(activity) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction([ACTIVITIES_STORE], "readwrite");
    const store = transaction.objectStore(ACTIVITIES_STORE);
    const request = store.put(activity);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Delete activity from IndexedDB
function deleteActivity(activityId) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction([ACTIVITIES_STORE], "readwrite");
    const store = transaction.objectStore(ACTIVITIES_STORE);
    const request = store.delete(activityId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Clear all activities from IndexedDB
function clearAllActivities() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction([ACTIVITIES_STORE], "readwrite");
    const store = transaction.objectStore(ACTIVITIES_STORE);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Clear config from IndexedDB
function clearConfig() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction([CONFIG_STORE], "readwrite");
    const store = transaction.objectStore(CONFIG_STORE);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Get activities by date range
function getActivitiesByDateRange(startDate, endDate) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction([ACTIVITIES_STORE], "readonly");
    const store = transaction.objectStore(ACTIVITIES_STORE);
    const index = store.index("date");
    const range = IDBKeyRange.bound(startDate, endDate);
    const request = index.getAll(range);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Get activities by type
function getActivitiesByType(type) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction([ACTIVITIES_STORE], "readonly");
    const store = transaction.objectStore(ACTIVITIES_STORE);
    const index = store.index("type");
    const request = index.getAll(type);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Get activities with losses
function getActivitiesWithLosses() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction([ACTIVITIES_STORE], "readonly");
    const store = transaction.objectStore(ACTIVITIES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const activities = request.result || [];
      const activitiesWithLosses = activities.filter(
        (activity) => activity.loss > 0
      );
      resolve(activitiesWithLosses);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Get activities without losses
function getActivitiesWithoutLosses() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction([ACTIVITIES_STORE], "readonly");
    const store = transaction.objectStore(ACTIVITIES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const activities = request.result || [];
      const activitiesWithoutLosses = activities.filter(
        (activity) => activity.loss === 0
      );
      resolve(activitiesWithoutLosses);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Get today's activities
function getTodaysActivities() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const transaction = db.transaction([ACTIVITIES_STORE], "readonly");
    const store = transaction.objectStore(ACTIVITIES_STORE);
    const index = store.index("date");
    const range = IDBKeyRange.bound(
      today.toISOString(),
      tomorrow.toISOString()
    );
    const request = index.getAll(range);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Check storage status
async function checkStorageStatus() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) {
      return 0; // Not supported
    }

    const estimate = await navigator.storage.estimate();
    return estimate.usage / estimate.quota;
  } catch (error) {
    console.error("Error checking storage:", error);
    return 0;
  }
}

// Set up event listeners (mantido igual)
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

// Toggle sidebar visibility (mantido igual)
function toggleSidebar() {
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
}

// Show specific section (mantido igual)
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

// Handle activity form submission (modificado para IndexedDB)
async function handleActivitySubmit(e) {
  e.preventDefault();

  // Desabilitar o botão para evitar múltiplos cliques
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  try {
    // Processar as fotos antes de salvar
    await processPhotosBeforeSave();

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

    // Create activity object - limitar tamanho das fotos
    const optimizedPhotos = await Promise.all(
      capturedPhotos.map((photo) => compressImage(photo, 0.7, 800))
    );

    const activity = {
      id: Date.now(),
      type: activityType,
      production: productionQty,
      loss: lossQty,
      lossType: lossType,
      date: activityDate,
      notes: activityNotes,
      photos: optimizedPhotos,
      employee: employeeName,
      timestamp: new Date().toISOString(),
    };

    // Save to IndexedDB
    await saveActivity(activity);

    // Add to local activities array
    activities.push(activity);

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
  } catch (error) {
    console.error("Error saving activity:", error);
    showToast("Erro ao salvar atividade: " + error.message, "error");
  } finally {
    // Reativar o botão
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Atividade';
  }
}

// Funções auxiliares para processamento de fotos (mantidas iguais)
function processPhotosBeforeSave() {
  return new Promise((resolve) => {
    if (capturedPhotos.length === 0) {
      resolve();
      return;
    }

    const processNextPhoto = async (index) => {
      if (index >= capturedPhotos.length) {
        resolve();
        return;
      }

      try {
        const compressedImage = await compressImage(
          capturedPhotos[index],
          0.7,
          800
        );
        capturedPhotos[index] = compressedImage;
        processNextPhoto(index + 1);
      } catch (error) {
        console.error("Error compressing image:", error);
        processNextPhoto(index + 1);
      }
    };

    processNextPhoto(0);
  });
}

function compressImage(dataUrl, quality, maxWidth) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function () {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = function () {
      reject(new Error("Falha ao carregar a imagem"));
    };

    img.src = dataUrl;
  });
}

// Handle config form submission (modificado para IndexedDB)
async function handleConfigSubmit(e) {
  e.preventDefault();

  try {
    // Get form values
    config.employeeName = document.getElementById("employeeName").value;
    config.company = document.getElementById("company").value;
    config.department = document.getElementById("department").value;
    config.language = document.getElementById("language").value;
    config.theme = document.getElementById("theme").value;

    // Save to IndexedDB
    await saveConfig(config);

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
  } catch (error) {
    console.error("Error saving config:", error);
    showToast("Erro ao salvar configurações: " + error.message, "error");
  }
}

// Handle photo upload (mantido igual)
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

// Start camera for taking photos (mantido igual)
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

// Stop camera (mantido igual)
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

// Capture photo from camera (mantido igual)
async function capturePhoto() {
  const canvas = document.createElement("canvas");
  canvas.width = cameraPreview.videoWidth;
  canvas.height = cameraPreview.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);

  try {
    const dataUrl = canvas.toDataURL("image/jpeg");

    // Comprimir a imagem imediatamente após a captura
    const compressedPhoto = await compressImage(dataUrl, 0.8, 1024);
    capturedPhotos.push(compressedPhoto);

    renderPhotoPreviews();
    stopCamera();
  } catch (error) {
    console.error("Error capturing photo:", error);
    showToast("Erro ao capturar foto. Tente novamente.", "error");
  }
}

// Render photo previews (mantido igual)
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

// View photo in modal (mantido igual)
function viewPhoto(photoData) {
  photoModalBody.innerHTML = `<img src="${photoData}" style="width: 100%; border-radius: 8px;">`;
  photoModal.classList.add("active");
}

// Update activities table (modificado para IndexedDB)
async function updateActivitiesTable() {
  try {
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
  } catch (error) {
    console.error("Error updating activities table:", error);
    showToast("Erro ao carregar atividades: " + error.message, "error");
  }
}

// View activity details (mantido igual)
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
            <div class="activity-detail-value">${activity.production}</div>
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
            <div class="activity-detail-value">${activity.employee}</div>
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

// Update dashboard (mantido igual)
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

// Update production chart (mantido igual)
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

// Generate report (modificado para IndexedDB)
// Generate report (função completamente reformulada)
async function generateReport() {
    try {
        const period = reportPeriod.value;
        const type = document.getElementById("reportType").value;
        let startDate, endDate;

        // Set date range based on period
        const now = new Date();
        endDate = now.toISOString();

        if (period === "today") {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            startDate = startDate.toISOString();
        } else if (period === "week") {
            startDate = new Date();
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            startDate = startDate.toISOString();
        } else if (period === "month") {
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 1);
            startDate.setHours(0, 0, 0, 0);
            startDate = startDate.toISOString();
        } else if (period === "custom") {
            const startDateInput = document.getElementById("startDate").value;
            const endDateInput = document.getElementById("endDate").value;
            
            if (!startDateInput || !endDateInput) {
                showToast("Por favor, selecione ambas as datas para o período personalizado.", "warning");
                return;
            }
            
            startDate = new Date(startDateInput);
            startDate.setHours(0, 0, 0, 0);
            startDate = startDate.toISOString();
            
            endDate = new Date(endDateInput);
            endDate.setHours(23, 59, 59, 999);
            endDate = endDate.toISOString();
        }

        // Get activities from IndexedDB for the selected period
        const periodActivities = await getActivitiesByDateRange(startDate, endDate);

        // Filter by type if specified
        let filteredActivities = periodActivities;
        if (type && type !== "") {
            filteredActivities = periodActivities.filter(
                (activity) => activity.type === type
            );
        }

        // Update report preview
        updateReportPreview(filteredActivities, startDate, endDate);

        // Show success message
        showToast("Relatório gerado com sucesso! Visualize a prévia abaixo.");

    } catch (error) {
        console.error("Error generating report:", error);
        showToast("Erro ao gerar relatório: " + error.message, "error");
    }
}
// Update report preview
function updateReportPreview(activities, startDate, endDate) {
    const reportPreview = document.getElementById("reportPreview");
    
    if (activities.length === 0) {
        reportPreview.innerHTML = `
            <div class="empty-state">
                <div><i class="fas fa-inbox"></i></div>
                <h3>Nenhuma atividade encontrada</h3>
                <p>Não há registros para os filtros selecionados.</p>
            </div>
        `;
        return;
    }

    // Calculate stats
    const totalProduction = activities.reduce(
        (sum, activity) => sum + activity.production,
        0
    );
    const totalLosses = activities.reduce(
        (sum, activity) => sum + activity.loss,
        0
    );
    const efficiency = totalProduction > 0
        ? (((totalProduction - totalLosses) / totalProduction) * 100).toFixed(1)
        : 0;

    const startDateFormatted = new Date(startDate).toLocaleDateString("pt-BR");
    const endDateFormatted = new Date(endDate).toLocaleDateString("pt-BR");
    const reportDate = new Date().toLocaleDateString("pt-BR");

    // Create HTML for the preview
    let previewHTML = `
        <div class="report-preview-header">
            <h3>Prévia do Relatório</h3>
            <p><strong>Período:</strong> ${startDateFormatted} a ${endDateFormatted}</p>
            <p><strong>Data do relatório:</strong> ${reportDate}</p>
            <button class="btn btn-success" id="exportPdfBtn">
                <i class="fas fa-file-pdf"></i> Exportar para PDF
            </button>
        </div>

        <div class="report-summary">
            <h4><i class="fas fa-chart-pie"></i> Resumo Estatístico</h4>
            <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
                <div class="stat-card">
                    <div class="stat-label">Total de Produção</div>
                    <div class="stat-value">${totalProduction}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total de Perdas</div>
                    <div class="stat-value">${totalLosses}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Eficiência</div>
                    <div class="stat-value">${efficiency}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total de Atividades</div>
                    <div class="stat-value">${activities.length}</div>
                </div>
            </div>
        </div>

        <div class="report-activities">
            <h4><i class="fas fa-table"></i> Detalhes das Atividades (${activities.length} registros)</h4>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Data/Hora</th>
                            <th>Tipo</th>
                            <th>Produção</th>
                            <th>Perdas</th>
                            <th>Tipo de Perda</th>
                            <th>Colaborador</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Add activities to the table
    activities.forEach(activity => {
        const date = new Date(activity.date);
        const formattedDate = date.toLocaleDateString("pt-BR");
        const formattedTime = date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });

        previewHTML += `
            <tr>
                <td>${formattedDate} ${formattedTime}</td>
                <td>${activity.type}</td>
                <td>${activity.production}</td>
                <td>${activity.loss > 0 ? activity.loss : '-'}</td>
                <td>${activity.lossType || '-'}</td>
                <td>${activity.employee}</td>
            </tr>
        `;
    });

    previewHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    reportPreview.innerHTML = previewHTML;

    // Add event listener to the export button
    document.getElementById("exportPdfBtn").addEventListener("click", () => {
        exportToPdf(activities, startDate, endDate);
    });
}

// Export to PDF function
async function exportToPdf(activities, startDate, endDate) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Calculate stats
        const totalProduction = activities.reduce(
            (sum, activity) => sum + activity.production,
            0
        );
        const totalLosses = activities.reduce(
            (sum, activity) => sum + activity.loss,
            0
        );
        const efficiency = totalProduction > 0
            ? (((totalProduction - totalLosses) / totalProduction) * 100).toFixed(1)
            : 0;

        const startDateFormatted = new Date(startDate).toLocaleDateString("pt-BR");
        const endDateFormatted = new Date(endDate).toLocaleDateString("pt-BR");
        const reportDate = new Date().toLocaleDateString("pt-BR");
        const reportTime = new Date().toLocaleTimeString("pt-BR");

        // Header
        doc.setFontSize(20);
        doc.setTextColor(44, 62, 80);
        doc.text("Relatório de Produção", 105, 15, { align: "center" });

        // Company Info
        doc.setFontSize(12);
        doc.setTextColor(128, 128, 128);
        doc.text(`Empresa: ${config.company || "Não especificada"}`, 20, 25);
        doc.text(`Departamento: ${config.department || "Não especificado"}`, 20, 32);
        doc.text(`Relatório gerado em: ${reportDate} às ${reportTime}`, 20, 39);

        // Period
        doc.text(`Período: ${startDateFormatted} a ${endDateFormatted}`, 105, 25, { align: "center" });

        // Summary
        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text("Resumo Estatístico", 20, 55);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Total de Produção: ${totalProduction}`, 20, 65);
        doc.text(`Total de Perdas: ${totalLosses}`, 20, 72);
        doc.text(`Eficiência: ${efficiency}%`, 20, 79);
        doc.text(`Total de Atividades: ${activities.length}`, 20, 86);

        // Activities table
        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text("Detalhes das Atividades", 20, 100);

        // Table headers
        doc.setFillColor(52, 152, 219);
        doc.setTextColor(255, 255, 255);
        doc.rect(20, 105, 170, 10, 'F');
        doc.text("Data/Hora", 25, 111);
        doc.text("Tipo", 60, 111);
        doc.text("Produção", 95, 111);
        doc.text("Perdas", 125, 111);
        doc.text("Colaborador", 150, 111);

        // Table content
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        let yPosition = 115;
        let page = 1;

        activities.forEach((activity, index) => {
            // Add new page if needed
            if (yPosition > 270 && index < activities.length - 1) {
                doc.addPage();
                yPosition = 20;
                page++;
                
                // Add header to new page
                doc.setFontSize(10);
                doc.setTextColor(128, 128, 128);
                doc.text(`Página ${page} - Relatório de Produção - ${config.company || "Não especificada"}`, 105, 10, { align: "center" });
                doc.setDrawColor(200, 200, 200);
                doc.line(20, 15, 190, 15);
                
                // Table headers for new page
                doc.setFillColor(52, 152, 219);
                doc.setTextColor(255, 255, 255);
                doc.rect(20, 20, 170, 10, 'F');
                doc.text("Data/Hora", 25, 26);
                doc.text("Tipo", 60, 26);
                doc.text("Produção", 95, 26);
                doc.text("Perdas", 125, 26);
                doc.text("Colaborador", 150, 26);
                
                yPosition = 30;
            }

            const date = new Date(activity.date);
            const formattedDate = date.toLocaleDateString("pt-BR");
            const formattedTime = date.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            });

            // Alternate row colors
            if (index % 2 === 0) {
                doc.setFillColor(245, 245, 245);
                doc.rect(20, yPosition - 4, 170, 6, 'F');
            }

            doc.setTextColor(0, 0, 0);
            doc.text(`${formattedDate} ${formattedTime}`, 25, yPosition);
            doc.text(activity.type, 60, yPosition);
            doc.text(activity.production.toString(), 95, yPosition);
            doc.text(activity.loss > 0 ? activity.loss.toString() : '-', 125, yPosition);
            doc.text(activity.employee, 150, yPosition);

            yPosition += 6;
        });

        // Check if there are photos to include
        const activitiesWithPhotos = activities.filter(activity => 
            activity.photos && activity.photos.length > 0
        );

        if (activitiesWithPhotos.length > 0) {
            // Add photos page
            doc.addPage();
            doc.setFontSize(14);
            doc.setTextColor(44, 62, 80);
            doc.text("Registros Fotográficos", 105, 20, { align: "center" });
            
            let photoYPosition = 30;
            let photoPage = page + 1;
            
            for (const activity of activitiesWithPhotos) {
                const date = new Date(activity.date);
                const formattedDate = date.toLocaleDateString("pt-BR");
                const formattedTime = date.toLocaleTimeString("pt-BR");
                
                for (let i = 0; i < activity.photos.length; i++) {
                    // Check if we need a new page
                    if (photoYPosition > 200) {
                        doc.addPage();
                        photoYPosition = 20;
                        photoPage++;
                        
                        // Add header to new page
                        doc.setFontSize(10);
                        doc.setTextColor(128, 128, 128);
                        doc.text(`Página ${photoPage} - Registros Fotográficos - ${config.company || "Não especificada"}`, 105, 10, { align: "center" });
                    }
                    
                    // Add photo metadata
                    doc.setFontSize(12);
                    doc.setTextColor(44, 62, 80);
                    doc.text(`Atividade: ${activity.type}`, 20, photoYPosition);
                    doc.text(`Data: ${formattedDate} ${formattedTime}`, 20, photoYPosition + 7);
                    doc.text(`Colaborador: ${activity.employee}`, 20, photoYPosition + 14);
                    
                    if (activity.notes) {
                        doc.setFontSize(10);
                        doc.text(`Observações: ${activity.notes}`, 20, photoYPosition + 21);
                    }
                    
                    // Add photo
                    try {
                        // Add image with reduced quality to keep file size manageable
                        doc.addImage(
                            activity.photos[i], 
                            'JPEG', 
                            20, 
                            photoYPosition + 25, 
                            170, 
                            100
                        );
                    } catch (error) {
                        console.error("Error adding image to PDF:", error);
                        doc.setFontSize(10);
                        doc.setTextColor(255, 0, 0);
                        doc.text("Erro ao carregar imagem", 20, photoYPosition + 25);
                    }
                    
                    photoYPosition += 140;
                    
                    // Add separation between photos
                    if (i < activity.photos.length - 1) {
                        doc.setDrawColor(200, 200, 200);
                        doc.line(20, photoYPosition, 190, photoYPosition);
                        photoYPosition += 10;
                    }
                }
                
                // Add separation between activities
                if (activitiesWithPhotos.indexOf(activity) < activitiesWithPhotos.length - 1) {
                    doc.setDrawColor(200, 200, 200);
                    doc.line(20, photoYPosition, 190, photoYPosition);
                    photoYPosition += 10;
                }
            }
        }

        // Save PDF
        const fileName = `relatorio_producao_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);

        showToast("PDF exportado com sucesso!");
    } catch (error) {
        console.error("Error exporting PDF:", error);
        showToast("Erro ao exportar PDF: " + error.message, "error");
    }
}

// Create backup (modificado para IndexedDB)
async function createBackup() {
  try {
    // Get all data from IndexedDB
    const backupData = {
      activities: await getAllActivities(),
      config: await getConfig(),
      timestamp: new Date().toISOString(),
      version: "1.0",
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(backupData);

    // Create blob and download
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `work_manager_backup_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("Backup criado com sucesso!");
  } catch (error) {
    console.error("Error creating backup:", error);
    showToast("Erro ao criar backup: " + error.message, "error");
  }
}

// Restore backup (modificado para IndexedDB)
async function restoreBackup() {
  try {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result);

          // Validate backup file
          if (!backupData.activities || !backupData.config) {
            throw new Error("Arquivo de backup inválido");
          }

          // Clear existing data
          await clearAllActivities();
          await clearConfig();

          // Restore activities
          for (const activity of backupData.activities) {
            await saveActivity(activity);
          }

          // Restore config
          await saveConfig(backupData.config);

          // Reload data
          await loadData();

          // Update UI
          updateActivitiesTable();
          updateDashboard();

          // Update config form
          if (Object.keys(config).length > 0) {
            document.getElementById("employeeName").value =
              config.employeeName || "";
            document.getElementById("company").value = config.company || "";
            document.getElementById("department").value =
              config.department || "";
            document.getElementById("language").value =
              config.language || "pt-BR";
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

          showToast("Backup restaurado com sucesso!");
        } catch (error) {
          console.error("Error restoring backup:", error);
          showToast("Erro ao restaurar backup: " + error.message, "error");
        }
      };

      reader.readAsText(file);
    };

    input.click();
  } catch (error) {
    console.error("Error restoring backup:", error);
    showToast("Erro ao restaurar backup: " + error.message, "error");
  }
}

// Clear all data (modificado para IndexedDB)
async function clearAllData() {
  if (
    !confirm(
      "Tem certeza que deseja apagar todos os dados? Esta ação não pode ser desfeita."
    )
  ) {
    return;
  }

  try {
    // Clear all data from IndexedDB
    await clearAllActivities();
    await clearConfig();

    // Reset local variables
    activities = [];
    config = {};

    // Update UI
    updateActivitiesTable();
    updateDashboard();

    // Reset config form
    document.getElementById("employeeName").value = "";
    document.getElementById("company").value = "";
    document.getElementById("department").value = "";
    document.getElementById("language").value = "pt-BR";
    document.getElementById("theme").value = "light";

    // Reset user avatar
    document.getElementById("userAvatar").textContent = "U";

    showToast("Todos os dados foram apagados com sucesso!");
  } catch (error) {
    console.error("Error clearing data:", error);
    showToast("Erro ao apagar dados: " + error.message, "error");
  }
}

// Show toast notification (mantido igual)
function showToast(message, type = "success") {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll(".toast");
  existingToasts.forEach((toast) => toast.remove());

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${
              type === "success"
                ? "fa-check-circle"
                : type === "error"
                ? "fa-exclamation-circle"
                : "fa-info-circle"
            }"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;

  // Add to DOM
  document.body.appendChild(toast);

  // Add close event
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.remove();
  });

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 5000);
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", init);
