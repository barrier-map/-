import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useAlert } from "../context/AlertContext";

export default function Register() {

  const navigate = useNavigate();
  const { alert } = useAlert();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = async (e) => {

    e.preventDefault();

    try {

      const response = await fetch(
        `${API_BASE_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {

        await alert("회원가입이 완료되었습니다.");

        navigate("/");

      } else {

        await alert(data.message);

      }

    } catch (err) {

      console.log(err);

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
        onSubmit={register}
        style={{
          width: "420px",
          background: "white",
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
          다락방 회원가입
        </h1>

        <input
          type="text"
          placeholder="닉네임"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={inputStyle}
        />

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
          회원가입
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
          }}
        >
          이미 계정이 있으신가요?

          <Link
            to="/"
            style={{
              color: "#6d5dfc",
              marginLeft: "8px",
              textDecoration: "none",
            }}
          >
            로그인
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