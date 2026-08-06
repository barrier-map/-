import { useState } from "react"
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";
import { useAlert } from "../context/AlertContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { alert } = useAlert();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        login(data.token, data.user);

        await alert("로그인 성공!");

        navigate("/dashboard");
      } else {
        await alert(data.message);
      }
    } catch (error) {
      console.error(error);
      await alert("서버 연결 실패");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f7f7fc",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "420px",
          background: "#fff",
          padding: "40px",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,.08)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#6d5dfc",
            marginBottom: "35px",
          }}
        >
          다락방 로그인
        </h1>

        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        <button
          type="submit"
          style={buttonStyle}
        >
          로그인
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
          }}
        >
          계정이 없으신가요?

          <Link
            to="/register"
            style={{
              color: "#6d5dfc",
              marginLeft: "8px",
              textDecoration: "none",
            }}
          >
            회원가입
          </Link>
        </p>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "15px",
  marginBottom: "18px",
  borderRadius: "12px",
  border: "1px solid #ddd",
  fontSize: "15px",
  outline: "none",
};

const buttonStyle = {
  width: "100%",
  padding: "15px",
  border: "none",
  borderRadius: "12px",
  background: "#6d5dfc",
  color: "white",
  fontSize: "16px",
  cursor: "pointer",
};