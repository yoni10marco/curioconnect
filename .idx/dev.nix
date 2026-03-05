{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_20
  ];

  idx = {
    extensions = [
      "msjsdiag.vscode-react-native"
      "dbaeumer.vscode-eslint"
    ];

    workspace = {
      onCreate = {
        npm-install = "npm install";
      };
      onStart = {
        expo-start = "npx expo start --web --port 3000";
      };
    };

    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npx" "expo" "start" "--web" "--port" "$PORT"];
          manager = "web";
        };
      };
    };
  };
}
