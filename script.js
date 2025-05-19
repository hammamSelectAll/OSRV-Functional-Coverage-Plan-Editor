(function() { // IIFE to encapsulate the code
    // --- Global State & Constants ---
    let appData = []; // Holds the array of modules (internal nested structure)
    const LOCAL_STORAGE_KEY = 'coveragePlanData_Flat'; // Key for localStorage
    const HIERARCHY_CONFIG = {
        module: { childrenKey: 'veLevels', childUiType: 've_level', displayName: 'Module', parentType: null },
        ve_level: { childrenKey: 'coverGroups', childUiType: 'cover_group', displayName: 'VE Level', parentType: 'module' },
        cover_group: { childrenKey: 'coverpoints', childUiType: 'coverpoint', displayName: 'Cover Group', parentType: 've_level' },
        coverpoint: { childrenKey: null, childUiType: null, displayName: 'Coverpoint', parentType: 'cover_group' }
    };
    const COVERPOINT_ATTRIBUTES = ["Coverpoint", "Cross", "Transition", "Condition", "Toggle", "Assertion", "State", "Sequence"];

    // --- DOM Elements ---
    const fileUploadEl = document.getElementById('fileUpload');
    const addModuleBtn = document.getElementById('addModuleBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const copyJsonBtn = document.getElementById('copyJsonBtn'); // ADDED THIS LINE
    const clearDataBtn = document.getElementById('clearDataBtn');
    const treeContainerEl = document.getElementById('treeContainer');
    const detailsPanelContentEl = document.getElementById('detailsContent');
    
    const modalEl = document.getElementById('modal');
    const modalTitleEl = document.getElementById('modalTitle');
    const modalFormEl = document.getElementById('modalForm');
    const formFieldsContainerEl = document.getElementById('formFieldsContainer');
    const modalCloseBtn = modalEl.querySelector('.close-button');
    const modalCancelBtn = modalEl.querySelector('.cancel-button');

    let currentEditingId = null;
    let currentParentIdForAdd = null;
    let currentItemUiTypeForAdd = null;

    // --- Initialization ---
    document.addEventListener('DOMContentLoaded', main);

    function main() {
        loadDataFromLocalStorage();
        renderApp();
        setupEventListeners();
    }

    function generateId() {
        return crypto.randomUUID();
    }

    // --- Data Transformation ---
    function transformFlatToNested(flatData) {
        const nestedData = [];
        const modulesMap = new Map();

        if (!Array.isArray(flatData)) {
            console.error("Input data is not an array.");
            showToast("Invalid JSON format: Expected an array of items.", "error");
            return [];
        }

        flatData.forEach(item => {
            if (typeof item !== 'object' || item === null) return;

            const moduleName = item.Module || "Unnamed Module";
            const veLevelName = item["VE level"] || "Unnamed VE Level";
            const cgName = item["Cover Group Name"] || "Unnamed Cover Group";

            // Module
            let currentModule = modulesMap.get(moduleName);
            if (!currentModule) {
                currentModule = { 
                    id: generateId(), 
                    name: moduleName, 
                    veLevels: [], 
                    expanded: true, 
                    uiType: 'module' 
                };
                modulesMap.set(moduleName, currentModule);
                nestedData.push(currentModule);
            }

            // VE Level
            let currentVeLevel = currentModule.veLevels.find(ve => ve.name === veLevelName);
            if (!currentVeLevel) {
                currentVeLevel = { 
                    id: generateId(), 
                    name: veLevelName, 
                    coverGroups: [], 
                    expanded: true, 
                    uiType: 've_level' 
                };
                currentModule.veLevels.push(currentVeLevel);
            }

            // Cover Group
            let currentCoverGroup = currentVeLevel.coverGroups.find(cg => cg.name === cgName);
            if (!currentCoverGroup) {
                currentCoverGroup = { 
                    id: generateId(), 
                    name: cgName, 
                    coverpoints: [], 
                    expanded: true, 
                    uiType: 'cover_group',
                    samplingEvent: item["Sampling Event"] || "",
                    groupComment: item["Group comment"] || ""
                };
                currentVeLevel.coverGroups.push(currentCoverGroup);
            } else {
                if (!currentCoverGroup.samplingEvent && item["Sampling Event"]) currentCoverGroup.samplingEvent = item["Sampling Event"];
                if (!currentCoverGroup.groupComment && item["Group comment"]) currentCoverGroup.groupComment = item["Group comment"];
            }

            // Coverpoint
            const coverpoint = {
                id: generateId(),
                name: item["Attribute name"] || "Unnamed Coverpoint",
                uiType: 'coverpoint',
                type: item["Attribute"] || COVERPOINT_ATTRIBUTES[0],
                weight: typeof item.weight === 'number' ? item.weight : 1,
                variableName: item["Variable Name"] || null,
                ranges: item["Ranges"] || "",
                ignore: item["Ignore"] || "No",
                illegal: item["Illegal"] || null,
                autoBinMax: item["auto_bin_max"] || null,
                owner: item["Owner"] || "",
                comments: item["Comments"] || null,
                collect: item["Collect"] || null,
                dependency: item["Dependency"] !== undefined ? item["Dependency"] : 1,
                dependencyName: item["Dependency Name"] || null,
                arrayOfGroups: item["Array of groups"] || null,
                note: item["Note"] || null,
                arrayOfInstances: item["Array of instances"] || null,
            };
            currentCoverGroup.coverpoints.push(coverpoint);
        });
        return nestedData;
    }

    function transformNestedToFlat(nestedData) {
        const flatData = [];
        nestedData.forEach(module => {
            (module.veLevels || []).forEach(veLevel => {
                (veLevel.coverGroups || []).forEach(coverGroup => {
                    (coverGroup.coverpoints || []).forEach(cp => {
                        const flatItem = {
                            "Module": module.name,
                            "VE level": veLevel.name,
                            "Cover Group Name": coverGroup.name,
                            "Sampling Event": coverGroup.samplingEvent || null,
                            "Group comment": coverGroup.groupComment || null,
                            "Attribute": cp.type,
                            "Attribute name": cp.name,
                            "weight": cp.weight,
                            "Variable Name": cp.variableName,
                            "Ranges": cp.ranges,
                            "Ignore": cp.ignore,
                            "Illegal": cp.illegal,
                            "auto_bin_max": cp.autoBinMax,
                            "Owner": cp.owner,
                            "Comments": cp.comments,
                            "Collect": cp.collect,
                            "Dependency": cp.dependency,
                            "Dependency Name": cp.dependencyName,
                            "Array of groups": cp.arrayOfGroups,
                            "Note": cp.note,
                            "Array of instances": cp.arrayOfInstances
                        };
                        flatData.push(flatItem);
                    });
                });
            });
        });
        return flatData;
    }

    // --- State Management ---
    function loadDataFromLocalStorage() {
        const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedData) {
            try {
                appData = JSON.parse(storedData); 
            } catch (e) {
                console.error("Error parsing data from localStorage:", e);
                appData = [];
                showToast("Error loading data from storage. It might be corrupted.", 'error');
            }
        } else {
            appData = [];
        }
    }

    function saveDataToLocalStorage() {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appData));
        } catch (e) {
            console.error("Error saving data to localStorage:", e);
            showToast("Error saving data. Storage might be full.", 'error');
        }
    }
    
    function findNodeInfo(id, currentNodes = appData, parentNode = null) {
        for (let i = 0; i < currentNodes.length; i++) {
            const node = currentNodes[i];
            if (node.id === id) {
                return { node, parentArray: currentNodes, index: i, parentNode };
            }
            const config = HIERARCHY_CONFIG[node.uiType];
            if (config && config.childrenKey && node[config.childrenKey]) {
                const found = findNodeInfo(id, node[config.childrenKey], node);
                if (found) return found;
            }
        }
        return null;
    }

    // --- Rendering ---
    function renderApp() {
        renderTree();
    }

    function renderTree() {
        if (appData.length === 0) {
            treeContainerEl.innerHTML = '<p>No coverage data. Upload a flat JSON file or click "Add Module" to start.</p>';
            return;
        }
        const treeHtml = `<ul class="top-level-list">${appData.map(module => renderNodeHtml(module, 0)).join('')}</ul>`;
        treeContainerEl.innerHTML = treeHtml;
    }

    function renderNodeHtml(item, level) {
        if (!item || !item.uiType) return '';
        const config = HIERARCHY_CONFIG[item.uiType];
        const children = config.childrenKey ? item[config.childrenKey] : null;
        const hasChildren = children && children.length > 0;

        const toggleIcon = children ? (item.expanded ? '▼' : '►') : (item.uiType !== 'coverpoint' ? '  ' : '');
        // All names are clickable to show details, `coverpoint-name` class kept for potential future specific styling.
        const nameClass = 'name' + (item.uiType === 'coverpoint' ? ' coverpoint-name' : '');
        
        let actionsHtml = `<button class="edit-btn" title="Edit ${config.displayName}">✎</button>
                           <button class="delete-btn" title="Delete ${config.displayName}">🗑️</button>`;
        if (config.childUiType) {
            actionsHtml = `<button class="add-child-btn" data-child-uitype="${config.childUiType}" title="Add ${HIERARCHY_CONFIG[config.childUiType].displayName}">⊕</button> ` + actionsHtml;
        }

        let html = `
            <li data-id="${item.id}" data-uitype="${item.uiType}">
                <div class="node-content">
                    <span class="toggle" data-id="${item.id}">${toggleIcon}</span>
                    <span class="${nameClass}" data-id="${item.id}" data-uitype="${item.uiType}">${item.name || `Unnamed ${config.displayName}`}</span>
                    <div class="node-actions">${actionsHtml}</div>
                </div>`;
        
        if (item.expanded && hasChildren) {
            html += `<ul>${children.map(child => renderNodeHtml(child, level + 1)).join('')}</ul>`;
        }
        html += `</li>`;
        return html;
    }

    function displayItemDetails(itemId, itemUiType) {
        const info = findNodeInfo(itemId);
        if (!info || !info.node) {
            detailsPanelContentEl.innerHTML = 'Select an item to see its details.';
            return;
        }
        const item = info.node;
        let html = '';

        if (itemUiType === 'module') {
            html = `<div class="detail-section"><p><strong>Name:</strong> ${item.name}</p></div>`;
        } else if (itemUiType === 've_level') {
            html = `<div class="detail-section"><p><strong>Name:</strong> ${item.name}</p></div>`;
        } else if (itemUiType === 'cover_group') {
            html = `
                <div class="detail-section">
                    <p><strong>Name:</strong> ${item.name}</p>
                    <p><strong>Sampling Event:</strong> ${item.samplingEvent || 'N/A'}</p>
                    <p><strong>Group Comment:</strong> ${item.groupComment || 'N/A'}</p>
                </div>`;
        } else if (itemUiType === 'coverpoint') {
            html = `
                <div class="detail-section">
                    <p><strong>Attribute Name:</strong> ${item.name}</p>
                    <p><strong>Attribute (Type):</strong> ${item.type}</p>
                    <p><strong>Weight:</strong> ${item.weight}</p>
                    <p><strong>Owner:</strong> ${item.owner || 'N/A'}</p>
                </div>
                <div class="detail-section">
                    <p><strong>Variable Name:</strong> ${item.variableName || 'N/A'}</p>
                    <p><strong>Ranges:</strong></p><pre style="white-space: pre-wrap; word-break: break-all; background: #eee; padding: 5px; border-radius:3px;">${item.ranges || 'N/A'}</pre>
                </div>
                <div class="detail-section">
                    <p><strong>Ignore:</strong> ${item.ignore || 'N/A'}</p>
                    <p><strong>Illegal:</strong> ${item.illegal || 'N/A'}</p>
                    <p><strong>Auto Bin Max:</strong> ${item.autoBinMax || 'N/A'}</p>
                    <p><strong>Collect:</strong> ${item.collect || 'N/A'}</p>
                </div>
                <div class="detail-section">
                    <p><strong>Dependency:</strong> ${item.dependency !== undefined ? item.dependency : 'N/A'}</p>
                    <p><strong>Dependency Name:</strong> ${item.dependencyName || 'N/A'}</p>
                    <p><strong>Array of groups:</strong> ${item.arrayOfGroups || 'N/A'}</p>
                    <p><strong>Array of instances:</strong> ${item.arrayOfInstances || 'N/A'}</p>
                </div>
                 <div class="detail-section">
                    <p><strong>Note:</strong> ${item.note || 'N/A'}</p>
                    <p><strong>Comments:</strong> ${item.comments || 'N/A'}</p>
                </div>
            `;
        }
        detailsPanelContentEl.innerHTML = html;
        document.getElementById('detailsPanel').querySelector('h2').textContent = `${HIERARCHY_CONFIG[itemUiType].displayName} Details`;
    }

    // --- CRUD Operations ---
    function handleFormSubmit(event) {
        event.preventDefault();
        const formData = new FormData(modalFormEl);
        const data = Object.fromEntries(formData.entries());

        if (data.weight) data.weight = parseFloat(data.weight);
        if (data.dependency) data.dependency = parseFloat(data.dependency);

        if (currentEditingId) {
            const info = findNodeInfo(currentEditingId);
            if (info) {
                Object.assign(info.node, data);
                showToast(`${HIERARCHY_CONFIG[info.node.uiType].displayName} updated.`, 'success');
            }
        } else {
            const newItemConfig = HIERARCHY_CONFIG[currentItemUiTypeForAdd];
            const newItem = { 
                ...data, 
                id: generateId(), 
                expanded: (newItemConfig.childUiType !== null),
                uiType: currentItemUiTypeForAdd 
            };

            if (newItemConfig.childrenKey) {
                newItem[newItemConfig.childrenKey] = [];
            }
            if (currentItemUiTypeForAdd === 'cover_group') {
                newItem.samplingEvent = newItem.samplingEvent || "";
                newItem.groupComment = newItem.groupComment || "";
            } else if (currentItemUiTypeForAdd === 'coverpoint') {
                newItem.type = newItem.type || COVERPOINT_ATTRIBUTES[0];
                newItem.weight = newItem.weight || 1;
                newItem.ignore = newItem.ignore || "No";
                newItem.dependency = newItem.dependency !== undefined ? newItem.dependency : 1;
            }

            if (newItemConfig.parentType === null) {
                appData.push(newItem);
            } else {
                const parentInfo = findNodeInfo(currentParentIdForAdd);
                if (parentInfo) {
                    const parentNode = parentInfo.node;
                    const childrenKey = HIERARCHY_CONFIG[parentNode.uiType].childrenKey;
                    if (!parentNode[childrenKey]) parentNode[childrenKey] = [];
                    parentNode[childrenKey].push(newItem);
                }
            }
            showToast(`${newItemConfig.displayName} added.`, 'success');
        }
        
        saveDataToLocalStorage();
        renderApp();
        if(currentEditingId) {
            const editedNodeInfo = findNodeInfo(currentEditingId);
            if (editedNodeInfo) {
                 displayItemDetails(currentEditingId, editedNodeInfo.node.uiType);
            }
        }
        closeModal();
    }

    function confirmDeleteItem(id) {
        const info = findNodeInfo(id);
        if (!info) return;
        
        const itemName = info.node.name || `Unnamed ${HIERARCHY_CONFIG[info.node.uiType].displayName}`;
        if (confirm(`Are you sure you want to delete "${itemName}"? This will also delete all its children.`)) {
            info.parentArray.splice(info.index, 1);
            saveDataToLocalStorage();
            renderApp();
            showToast(`${HIERARCHY_CONFIG[info.node.uiType].displayName} deleted.`, 'success');
            detailsPanelContentEl.innerHTML = 'Select an item to see its details.';
            document.getElementById('detailsPanel').querySelector('h2').textContent = `Item Details`;
        }
    }

    function toggleExpand(id) {
        const info = findNodeInfo(id);
        if (info && info.node) {
            info.node.expanded = !info.node.expanded;
            saveDataToLocalStorage();
            renderTree();
        }
    }

    // --- Modal Logic ---
    function openModal(title, uiType, itemData = null, parentId = null) {
        modalTitleEl.textContent = title;
        currentEditingId = itemData ? itemData.id : null;
        currentParentIdForAdd = parentId;
        currentItemUiTypeForAdd = uiType;

        createFormFields(uiType, itemData);
        modalEl.style.display = 'block';
    }

    function closeModal() {
        modalEl.style.display = 'none';
        modalFormEl.reset();
        formFieldsContainerEl.innerHTML = '';
        currentEditingId = null;
        currentParentIdForAdd = null;
        currentItemUiTypeForAdd = null;
    }
    
    function createFormFields(uiType, itemData = {}) {
        formFieldsContainerEl.innerHTML = ''; 
        const isNewItem = !itemData || Object.keys(itemData).length === 0 || !itemData.id;

        const addField = (label, name, type = 'text', value = '', options = null, required = true, placeholder = '', parentDiv = formFieldsContainerEl) => {
            const fieldWrapper = document.createElement('div');
            fieldWrapper.className = 'form-group';
            const labelEl = document.createElement('label');
            labelEl.htmlFor = `field-${name}`;
            labelEl.textContent = label;
            fieldWrapper.appendChild(labelEl);

            let inputEl;
            if (type === 'textarea') {
                inputEl = document.createElement('textarea');
                inputEl.value = value || '';
            } else if (type === 'select') {
                inputEl = document.createElement('select');
                options.forEach(optVal => {
                    const optionEl = document.createElement('option');
                    optionEl.value = optVal;
                    optionEl.textContent = optVal;
                    if (optVal === value) optionEl.selected = true;
                    inputEl.appendChild(optionEl);
                });
            } else {
                inputEl = document.createElement('input');
                inputEl.type = type;
                inputEl.value = value || (type === 'number' ? '' : ''); // Default empty for numbers in form
                if (type === 'number') inputEl.step = name === 'weight' ? 'any' : '1';
            }
            inputEl.id = `field-${name}`;
            inputEl.name = name;
            if (required) inputEl.required = true;
            if (placeholder) inputEl.placeholder = placeholder;
            fieldWrapper.appendChild(inputEl);
            parentDiv.appendChild(fieldWrapper);
        };
        
        addField('Name', 'name', 'text', itemData.name || '', null, true, `Enter ${HIERARCHY_CONFIG[uiType].displayName} name`);

        if (uiType === 'cover_group') {
             const cgColumns = document.createElement('div');
             cgColumns.className = 'form-columns';
             formFieldsContainerEl.appendChild(cgColumns);
            addField('Sampling Event', 'samplingEvent', 'text', itemData.samplingEvent || '', null, false, 'e.g., Register Access', cgColumns);
            addField('Group Comment', 'groupComment', 'textarea', itemData.groupComment || '', null, false, 'Description of the cover group', cgColumns);
        } else if (uiType === 'coverpoint') {
            const cpData = isNewItem ? {
                type: COVERPOINT_ATTRIBUTES[0], weight: 1, ranges: "", owner: "", variableName: null,
                ignore: "No", illegal: null, autoBinMax: null, comments: null, collect: null,
                dependency: 1, dependencyName: null, arrayOfGroups: null, note: null, arrayOfInstances: null,
                ...itemData 
            } : itemData;

             const cpColumns = document.createElement('div');
             cpColumns.className = 'form-columns';
             formFieldsContainerEl.appendChild(cpColumns);

            addField('Attribute (Type)', 'type', 'select', cpData.type, COVERPOINT_ATTRIBUTES, true, '', cpColumns);
            addField('Weight', 'weight', 'number', cpData.weight, null, false, 'e.g., 1', cpColumns);
            addField('Owner', 'owner', 'text', cpData.owner, null, false, 'e.g., John Doe', cpColumns);
            addField('Variable Name', 'variableName', 'text', cpData.variableName, null, false, 'e.g., rvtop.orv.dec.reg[4:0]', cpColumns);
            
            addField('Ignore', 'ignore', 'text', cpData.ignore, null, false, 'e.g., No, Yes, condition', cpColumns);
            addField('Illegal', 'illegal', 'text', cpData.illegal, null, false, 'e.g., No, Yes, condition', cpColumns);
            addField('Auto Bin Max', 'autoBinMax', 'text', cpData.autoBinMax, null, false, 'e.g., 64 or empty', cpColumns);
            addField('Collect', 'collect', 'text', cpData.collect, null, false, 'Condition for collection', cpColumns);
            
            addField('Dependency', 'dependency', 'number', cpData.dependency, null, false, 'e.g., 1', cpColumns);
            addField('Dependency Name', 'dependencyName', 'text', cpData.dependencyName, null, false, 'Name of dependency', cpColumns);
            addField('Array of groups', 'arrayOfGroups', 'text', cpData.arrayOfGroups, null, false, 'Related groups', cpColumns);
            addField('Array of instances', 'arrayOfInstances', 'text', cpData.arrayOfInstances, null, false, 'Related instances', cpColumns);

            addField('Ranges / Bins', 'ranges', 'textarea', cpData.ranges, null, false, 'Define bins, e.g., val_a = {[0:10], 100};', formFieldsContainerEl);
            addField('Note', 'note', 'textarea', cpData.note, null, false, 'Additional notes for this item', formFieldsContainerEl);
            addField('Comments', 'comments', 'textarea', cpData.comments, null, false, 'General comments', formFieldsContainerEl);
        }
    }

    // --- Event Handlers ---
    function setupEventListeners() {
        fileUploadEl.addEventListener('change', handleFileUpload);
        addModuleBtn.addEventListener('click', () => {
            openModal('Add New Module', 'module', {});
        });
        exportJsonBtn.addEventListener('click', handleExport);
        copyJsonBtn.addEventListener('click', handleCopyJson); // ADDED THIS LINE

        clearDataBtn.addEventListener('click', handleClearData);

        modalFormEl.addEventListener('submit', handleFormSubmit);
        modalCloseBtn.addEventListener('click', closeModal);
        modalCancelBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (event) => {
            if (event.target == modalEl) closeModal();
        });

        treeContainerEl.addEventListener('click', handleTreeClick);
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const rawFlatData = JSON.parse(e.target.result);
                appData = transformFlatToNested(rawFlatData);
                saveDataToLocalStorage();
                renderApp();
                showToast('File loaded and processed successfully!', 'success');
            } catch (err) {
                console.error("Error processing uploaded file:", err);
                showToast(`Error: ${err.message}`, 'error');
            } finally {
                fileUploadEl.value = '';
            }
        };
        reader.onerror = () => {
            showToast('Error reading file.', 'error');
            fileUploadEl.value = '';
        };
        reader.readAsText(file);
    }

    function handleTreeClick(event) {
        const target = event.target;
        const listItem = target.closest('li[data-id]');
        if (!listItem) return;

        const id = listItem.dataset.id;
        const uiType = listItem.dataset.uitype;

        if (target.classList.contains('toggle')) {
            toggleExpand(id);
        } else if (target.classList.contains('name')) {
             displayItemDetails(id, uiType);
        } else if (target.classList.contains('add-child-btn')) {
            const childUiType = target.dataset.childUitype;
            openModal(`Add New ${HIERARCHY_CONFIG[childUiType].displayName}`, childUiType, {}, id);
        } else if (target.classList.contains('edit-btn')) {
            const info = findNodeInfo(id);
            if (info) openModal(`Edit ${HIERARCHY_CONFIG[uiType].displayName}`, uiType, info.node);
        } else if (target.classList.contains('delete-btn')) {
            confirmDeleteItem(id);
        }
    }

    function handleExport() {
        if (appData.length === 0) {
            showToast('No data to export.', 'warning');
            return;
        }
        const flatDataToExport = transformNestedToFlat(appData);
        const jsonString = JSON.stringify(flatDataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'coverage-plan-flat.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Flat JSON exported successfully!', 'success');
    }

        // NEW FUNCTION TO HANDLE COPYING JSON
        async function handleCopyJson() {
            if (appData.length === 0) {
                showToast('No data to copy.', 'warning');
                return;
            }
            const flatDataToExport = transformNestedToFlat(appData);
            const jsonString = JSON.stringify(flatDataToExport, null, 2);
    
            try {
                await navigator.clipboard.writeText(jsonString);
                showToast('JSON copied to clipboard!', 'success');
            } catch (err) {
                console.error('Failed to copy JSON: ', err);
                showToast('Failed to copy JSON. See console for details.', 'error');
                // Fallback for older browsers or if Clipboard API fails (less ideal UX)
                // You could display the JSON in a textarea for manual copying,
                // but the Clipboard API is widely supported now.
            }
        }
    
    
    function handleClearData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            appData = [];
            renderApp();
            detailsPanelContentEl.innerHTML = 'Select an item to see its details.';
            document.getElementById('detailsPanel').querySelector('h2').textContent = `Item Details`;
            showToast('All data cleared.', 'success');
        }
    }

    function showToast(message, type = 'success') {
        const toastEl = document.getElementById('toast');
        toastEl.textContent = message;
        toastEl.className = 'toast show';
        if (type === 'error') {
            toastEl.style.backgroundColor = 'var(--danger-color)';
             toastEl.style.color = 'white';
        } else if (type === 'warning') {
            toastEl.style.backgroundColor = 'var(--warning-color)';
            toastEl.style.color = 'var(--dark-gray)';
        } else { // success
            toastEl.style.backgroundColor = 'var(--success-color)';
            toastEl.style.color = 'white';
        }
        setTimeout(() => {
            toastEl.className = toastEl.className.replace(' show', '');
        }, 3000);
    }
})();