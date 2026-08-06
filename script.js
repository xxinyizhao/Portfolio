const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

document.querySelectorAll("[data-dialog]").forEach((card) => {
  card.addEventListener("click", () => {
    const dialog = document.querySelector(`#${card.dataset.dialog}`);
    if (dialog && !dialog.open) dialog.showModal();
  });
});

document.querySelectorAll(".dialog-close").forEach((button) => {
  button.addEventListener("click", () => {
    const dialog = button.closest("dialog");
    if (dialog?.open) dialog.close();
  });
});

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});
