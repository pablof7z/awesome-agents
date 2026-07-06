set shell := ["bash", "-uc"]

# Bump version, refresh changelog, run checks, commit + tag, push, then publish to npm
release bump="patch":
    npm run release -- {{bump}} --push
    npm publish --otp=$(2fa npm)
