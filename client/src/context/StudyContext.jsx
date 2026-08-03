import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const StudyContext = createContext();

export function StudyProvider({ children }) {

  const [seconds, setSeconds] = useState(() => {
    return Number(localStorage.getItem("studyTime") || 0);
  });

  const [running, setRunning] = useState(false);

  useEffect(() => {

    if (!running) return;

    const timer = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);

  }, [running]);

  useEffect(() => {
    localStorage.setItem("studyTime", seconds);
  }, [seconds]);

  function resetTimer(){
    setRunning(false);
    setSeconds(0);
    localStorage.removeItem("studyTime");
  }

  function formatTime(){

    const h = String(Math.floor(seconds / 3600)).padStart(2,"0");
    const m = String(Math.floor(seconds % 3600 / 60)).padStart(2,"0");
    const s = String(seconds % 60).padStart(2,"0");

    return `${h}:${m}:${s}`;
  }

  return(
    <StudyContext.Provider
      value={{
        seconds,
        running,
        setRunning,
        resetTimer,
        formatTime
      }}
    >
      {children}
    </StudyContext.Provider>
  );

}

export function useStudy(){
  return useContext(StudyContext);
}