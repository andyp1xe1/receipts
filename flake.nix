{
  description = "receipt-ledger dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        fhs = pkgs.buildFHSEnv {
          name = "receipt-ledger";
          targetPkgs = pkgs: with pkgs; [
            bun
            nodejs_22
            git
            pkg-config
            openssl
          ];
          runScript = "bash";
        };
      in {
        devShells.default = pkgs.mkShell {
          packages = [ fhs ];

          shellHook = ''
            exec ${fhs}/bin/receipt-ledger
          '';
        };
      });
}
