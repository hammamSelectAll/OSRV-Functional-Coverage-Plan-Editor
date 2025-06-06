# Functional Coverage Plan Editor (Flat JSON Version)

A single-page web application designed to help engineers view, manage, and edit Functional Coverage Plans. The application operates entirely within the browser, using vanilla HTML, CSS, and JavaScript, and persists data to the browser's local storage. It supports importing and exporting coverage plans in a flat JSON array format.

## Overview

This tool provides a user-friendly interface to:
*   Upload existing coverage plans from a flat JSON file.
*   Navigate the plan through a collapsible hierarchical tree view (Modules → VE Levels → Cover Groups → Coverpoints).
*   Perform CRUD (Create, Read, Update, Delete) operations on all elements of the coverage plan.
*   View detailed properties of any selected item.
*   Persist all changes automatically to the browser's local storage.
*   Export the modified coverage plan back into the flat JSON format.

## Features

*   **File Upload & Initialization:**
    *   Upload flat JSON files representing the coverage plan.
    *   The application transforms the flat data into an internal hierarchical structure for editing and display.
*   **Hierarchical Navigation:**
    *   Collapsible tree view for Modules, VE Levels, Cover Groups, and Coverpoints.
    *   Easy expansion/collapse of tree nodes.
*   **CRUD Operations:**
    *   **Create:** Add new Modules, VE Levels, Cover Groups, and Coverpoints via intuitive forms.
    *   **Read:** Display detailed properties of any selected item in a dedicated side panel.
    *   **Update:** Modify any field of an existing item through forms.
    *   **Delete:** Remove any node (Module, VE Level, Cover Group, or Coverpoint) with confirmation.
*   **Data Persistence:**
    *   All changes are automatically saved to the browser's `localStorage`.
    *   The plan is reloaded from `localStorage` when the application is reopened in the same browser.
*   **Export JSON:**
    *   Download the edited coverage plan as a flat JSON array, matching the expected input format.
*   **User Experience:**
    *   Clean, modern, and responsive design.
    *   Visual feedback for actions (e.g., toast notifications).
    *   Clear forms with labels and placeholders.
*   **Technology:**
    *   Built with pure HTML5, CSS3, and Vanilla JavaScript (ES6+).
    *   No external libraries or build tools required.

## Prerequisites

*   A modern web browser (e.g., Chrome, Firefox, Edge, Safari).

## Setup & Installation

1.  **Download Files:** Ensure you have all three core files:
    *   `index.html`
    *   `style.css`
    *   `script.js`
2.  **Place Files:** Place all three files in the same directory on your local machine.
3.  **Open Application:** Open the `index.html` file in your web browser.

## Usage Instructions

1.  **Upload JSON Data:**
    *   Click the "**Choose File**" button in the header.
    *   Select a `.json` file. The file should contain a flat array of objects, where each object represents a coverage item and includes fields like `Module`, `VE level`, `Cover Group Name`, `Attribute name`, `Ranges`, `Owner`, etc. (See "Data Format" below for more details).
    *   The application will parse the file and display the data in the tree view.
    *   If no file is uploaded, you can start building a plan from scratch using the "Add Module" button.

2.  **Navigate the Tree:**
    *   The coverage plan is displayed as a hierarchical tree on the left.
    *   Click the '►' (expand) or '▼' (collapse) icons next to Modules, VE Levels, or Cover Groups to show/hide their children.
    *   Click on the name of any item (Module, VE Level, Cover Group, or Coverpoint) in the tree to view its details in the right-hand panel.

3.  **Manage Items (CRUD):**
    *   **Add Module:** Click the "**Add Module**" button in the header.
    *   **Add Child Item:** Click the '⊕' (plus) icon next to a Module, VE Level, or Cover Group in the tree to add a child to it (e.g., add a VE Level to a Module).
    *   **Edit Item:** Click the '✎' (pencil) icon next to any item in the tree. A modal form will appear with the item's current data, allowing you to make changes.
    *   **Delete Item:** Click the '🗑️' (trash can) icon next to any item. A confirmation prompt will appear before deletion. Deleting an item will also delete all its children.

4.  **View Details:**
    *   When an item is clicked in the tree, its properties are displayed in the "Item Details" panel on the right.

5.  **Export JSON Data:**
    *   Click the "**Export JSON**" button in the header.
    *   The current state of the coverage plan will be downloaded as a `coverage-plan-flat.json` file, in the original flat array format.

6.  **Clear All Data:**
    *   Click the "**Clear All Data**" button in the header.
    *   This will remove the entire coverage plan from your browser's local storage. This action requires confirmation.

## Data Format

*   **Input JSON (Upload):**
    The application expects a flat JSON array. Each object in the array represents a distinct coverage point or attribute and contains all its associated hierarchical information.
    Example structure of an object in the array:
    ```json
    {
        "Module": "MyModule",
        "VE level": "BlockLevel_Basic",
        "Cover Group Name": "MyCoverGroup",
        "Sampling Event": "clk_event",
        "Group comment": "Covers basic functionality",
        "weight": 1,
        "Attribute": "Coverpoint", // Or "Cross", "Transition", etc.
        "Attribute name": "MyCoverpointName",
        "Variable Name": "dut.path.to.signal",
        "Ranges": "bin_a = [0:10]; bin_b = default;",
        "Ignore": "No",
        "Illegal": "No",
        "auto_bin_max": null,
        "Owner": "John Doe",
        "Comments": "This is a crucial coverpoint.",
        "Collect": null,
        "Dependency": 1,
        "Dependency Name": null,
        "Array of groups": null,
        "Note": null,
        "Array of instances": null
    }
    ```
    The application will group these flat items into a hierarchical structure (Module → VE Level → Cover Group → Coverpoint) internally for display and editing.

*   **Output JSON (Export):**
    The exported JSON will be in the same flat array format as the input, with each object representing a coverpoint and its associated parent/group information.

## Data Persistence

*   All modifications to the coverage plan are automatically saved to your web browser's `localStorage`.
*   This means your data will persist across browser sessions (i.e., if you close and reopen the browser or the tab).
*   **Important:** `localStorage` is specific to the browser and the domain (in this case, the local file path). Data will not be shared across different browsers or if you move the `index.html` file to a different location. Clearing your browser's cache/data for the site can also remove the stored plan.

## File Structure

*   `index.html`: The main HTML file containing the page structure.
*   `style.css`: Contains all CSS rules for styling the application.
*   `script.js`: Contains all the JavaScript logic for application functionality, data management, and DOM manipulation.

## Future Enhancements (Potential)

*   Advanced search and filtering capabilities.
*   More robust input validation for form fields.
*   Support for different coverage item types beyond the current scope.
*   Visual progress indicators or summaries.
*   User-configurable themes or settings.

---

Feel free to modify or extend this README as your project evolves!