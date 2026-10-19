{
  description = "Android widgets for daily and weekly spending against an Actual Budget monthly budget";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = {nixpkgs, ...}: let
    forAllSystems = nixpkgs.lib.genAttrs ["x86_64-linux" "aarch64-linux" "aarch64-darwin"];
  in {
    # The Android SDK is not here. Gradle downloads exact NDK and build-tools
    # versions into the SDK folder, which a read-only Nix SDK can't take.
    devShells = forAllSystems (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      default = pkgs.mkShell {
        packages = [pkgs.nodejs_22 pkgs.jdk17];
        JAVA_HOME = pkgs.jdk17.home;
      };
    });
  };
}
