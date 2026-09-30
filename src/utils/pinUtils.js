import LocalStorageService from "../services/LocalStorageService";

export const pinnedFirst = (a, b) =>
  a.isPinned !== b.isPinned ? (a.isPinned ? -1 : 1) : 0;

export const makeTogglePin = (sheet, loadData, showToast) => (id) => {
  const result = LocalStorageService.togglePin(sheet, id);
  if (result.success) {
    loadData();
  } else {
    showToast(result.message, "warning");
  }
};
