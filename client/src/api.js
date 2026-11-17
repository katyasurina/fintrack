const BASE_URL = '/api';
let currentUid = Number(localStorage.getItem('ft_uid')) || 1;

export const setUid = (id) => {
  currentUid = id;
  localStorage.setItem('ft_uid', id);
};

export const getUid = () => currentUid;

export const api = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': currentUid,
      ...options.headers,
    },
  });

  // Якщо статус 204 (No Content) — це успішне видалення, тіла немає
  if (res.status === 204) {
    return null;
  }

  // Якщо сервер повернув помилку
  if (!res.ok) {
    // Намагаємось прочитати текст, навіть якщо це не JSON
    const text = await res.text();
    let errorMsg = 'Помилка запиту';
    try {
      const errorJson = JSON.parse(text);
      errorMsg = errorJson.error || errorMsg;
    } catch (e) {
      // Якщо не вдалося розпарсити як JSON, використовуємо текст як є
      errorMsg = text || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return res.json();
};