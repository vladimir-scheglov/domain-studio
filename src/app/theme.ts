import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#1e1e1e",
      paper: "#252526",
    },
    primary: { main: "#0e639c" },
    divider: "#3c3c3c",
    text: {
      primary: "#d4d4d4",
      secondary: "#9d9d9d",
    },
  },
  typography: {
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 13,
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: "none", fontSize: 13 } },
    },
  },
});
