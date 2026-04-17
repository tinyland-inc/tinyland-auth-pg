{
  description = "@tummycrypt/tinyland-auth-pg — PostgreSQL storage adapter";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        nodejs = pkgs.nodejs_20;
        pnpm = pkgs.pnpm;
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [ nodejs pnpm pkgs.typescript ];
        };
        packages.default = pkgs.buildNpmPackage {
          pname = "tinyland-auth-pg";
          version = "0.2.0";
          src = ./.;
          npmDepsHash = "";  # Run nix build first to get hash
          nodejs = nodejs;
          buildPhase = "pnpm build";
          installPhase = "cp -r dist $out";
        };
      });
}
