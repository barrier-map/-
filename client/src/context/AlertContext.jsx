import { createContext, useContext, useState, useCallback } from "react";
import "../styles/Alert.css";

const AlertContext = createContext(null);

// 사이트 전체에서 쓸 수 있는, 화면 중앙에 뜨는 알림/확인 팝업
export function AlertProvider({ children }) {
  const [modal, setModal] = useState(null);
  // modal: { type: "alert" | "confirm", message, resolve }

  // alert("메시지") : 확인 버튼만 있는 안내 팝업
  const alert = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({ type: "alert", message, resolve });
    });
  }, []);

  // confirm("메시지") : 확인/취소가 있는 팝업, true/false를 돌려줌
  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({ type: "confirm", message, resolve });
    });
  }, []);

  const close = (result) => {
    if (modal) modal.resolve(result);
    setModal(null);
  };

  return (
    <AlertContext.Provider value={{ alert, confirm }}>
      {children}

      {modal && (
        <div className="modal-bg">
          <div className="modal alert-modal">
            <p className="alert-message">{modal.message}</p>

            <div className="modal-buttons">
              {modal.type === "confirm" && (
                <button className="cancel-btn" onClick={() => close(false)}>
                  취소
                </button>
              )}

              <button
                className="confirm-btn"
                onClick={() => close(true)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);

  if (!ctx) {
    throw new Error("useAlert()는 AlertProvider 안에서만 사용할 수 있습니다.");
  }

  return ctx;
}
