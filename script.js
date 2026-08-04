// Find the empty footer span and insert the visitor's current calendar year.
document.querySelector("#year").textContent = new Date().getFullYear();

// Find every project card carrying a data-dialog attribute.
document.querySelectorAll("[data-dialog]").forEach((card) => {
  // Run this function whenever a visitor clicks the current project card.
  card.addEventListener("click", () => {
    // Read the popup ID from the card and open that native dialog as a modal.
    document.querySelector(`#${card.dataset.dialog}`)?.showModal();
  });
});

// Find each close button located inside a project popup.
document.querySelectorAll(".dialog-close").forEach((button) => {
  // Close the nearest parent dialog when its close button is clicked.
  button.addEventListener("click", () => button.closest("dialog").close());
});

// Find every dialog so clicking its dark outer backdrop can also close it.
document.querySelectorAll("dialog").forEach((dialog) => {
  // Listen for clicks anywhere on this dialog and its contents.
  dialog.addEventListener("click", (event) => {
    // Close only when the dialog backdrop itself was clicked, not its content.
    if (event.target === dialog) dialog.close();
  });
});

// Make every element with the draggable class movable with a mouse or finger.
document.querySelectorAll(".draggable").forEach((item) => {
  // Remember the pointer's starting horizontal position.
  let startX = 0;
  // Remember the pointer's starting vertical position.
  let startY = 0;
  // Preserve how far the item has already moved horizontally.
  let offsetX = 0;
  // Preserve how far the item has already moved vertically.
  let offsetY = 0;

  // Begin a drag when the visitor presses a mouse button or touches the item.
  item.addEventListener("pointerdown", (event) => {
    // Calculate a starting point that includes movement from earlier drags.
    startX = event.clientX - offsetX;
    startY = event.clientY - offsetY;
    // Add a class that changes the cursor and drop shadow during dragging.
    item.classList.add("is-dragging");
    // Keep receiving pointer events even if the pointer leaves the item.
    item.setPointerCapture(event.pointerId);
  });

  // Reposition the item whenever the captured pointer moves.
  item.addEventListener("pointermove", (event) => {
    // Ignore movement when this item does not own the active pointer.
    if (!item.hasPointerCapture(event.pointerId)) return;
    // Calculate how far the visitor has dragged from the starting point.
    offsetX = event.clientX - startX;
    offsetY = event.clientY - startY;
    // Apply that horizontal and vertical movement without changing layout flow.
    item.style.translate = `${offsetX}px ${offsetY}px`;
  });

  // Finish the drag when the mouse button or finger is released.
  item.addEventListener("pointerup", (event) => {
    // Remove the temporary dragging appearance.
    item.classList.remove("is-dragging");
    // Release the pointer so other elements can receive its events normally.
    item.releasePointerCapture(event.pointerId);
  });
});
