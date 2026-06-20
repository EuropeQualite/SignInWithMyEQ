# PHP + MyEQ

Integrate MyEQ in PHP with
[`league/oauth2-client`](https://github.com/thephpleague/oauth2-client) using its
`GenericProvider` and built-in PKCE. Server-side confidential client.

## 1. Prerequisites

A `client_id` (and `client_secret` for a confidential server-side client) from EQ
([Getting access](../README.md#-getting-access)), with your redirect URI
registered, e.g. `https://yourapp.example.com/callback.php`.

PKCE support requires **`league/oauth2-client` ≥ 2.7**:

```bash
composer require league/oauth2-client
```

## 2. Configure the provider

Endpoints come from the
[discovery document](https://auth.europequalitegroup.com/.well-known/openid-configuration);
hard-coded here for clarity.

```php
<?php
// provider.php
require 'vendor/autoload.php';

use League\OAuth2\Client\Provider\GenericProvider;
use League\OAuth2\Client\Provider\AbstractProvider;

const ISSUER = 'https://auth.europequalitegroup.com';

function myeqProvider(): GenericProvider {
    $provider = new GenericProvider([
        'clientId'                => getenv('OIDC_CLIENT_ID'),
        'clientSecret'            => getenv('OIDC_CLIENT_SECRET'),
        'redirectUri'             => 'https://yourapp.example.com/callback.php',
        'urlAuthorize'            => ISSUER . '/oidc/authorize',
        'urlAccessToken'          => ISSUER . '/oidc/token',
        'urlResourceOwnerDetails' => ISSUER . '/oidc/userinfo',
        'scopes'                  => 'openid profile email',
        'scopeSeparator'          => ' ',
    ]);
    // PKCE (S256) is mandatory for every MyEQ client.
    $provider->setPkceMethod(AbstractProvider::PKCE_METHOD_S256);
    return $provider;
}
```

## 3. Start the login

```php
<?php
// login.php
session_start();
require 'provider.php';
$provider = myeqProvider();

$url = $provider->getAuthorizationUrl();
$_SESSION['oauth2state'] = $provider->getState();
$_SESSION['oauth2pkce']  = $provider->getPkceCode(); // PKCE verifier — keep server-side
header('Location: ' . $url);
exit;
```

## 4. Handle the callback

```php
<?php
// callback.php
session_start();
require 'provider.php';
$provider = myeqProvider();

if (empty($_GET['state']) || $_GET['state'] !== ($_SESSION['oauth2state'] ?? null)) {
    unset($_SESSION['oauth2state']);
    exit('Invalid state');
}

$provider->setPkceCode($_SESSION['oauth2pkce']); // replay the stored verifier

$token = $provider->getAccessToken('authorization_code', ['code' => $_GET['code']]);

$_SESSION['access_token']  = $token->getToken();
$_SESSION['refresh_token'] = $token->getRefreshToken(); // requires offline_access scope
$_SESSION['expires']       = $token->getExpires();

// Profile claims (calls /oidc/userinfo)
$user = $provider->getResourceOwner($token)->toArray();
$_SESSION['user'] = $user; // sub, name, email, …

header('Location: /');
```

## 5. Calling an API

```php
$response = $provider->getAuthenticatedRequest(
    'GET',
    'https://api.example.com/things',
    $_SESSION['access_token'],
); // adds: Authorization: Bearer <token>
```

The access token is **opaque** — a PHP resource server validates it via the
introspection endpoint (same idea as
[node-resource-server.md](node-resource-server.md): POST `/oidc/introspect` with
HTTP Basic client auth).

## 6. Refresh

Access tokens last **15 min**. With `offline_access` in scope you get a refresh
token (**rotated on every use** — always store the new one):

```php
if ($_SESSION['expires'] < time()) {
    $new = $provider->getAccessToken('refresh_token', [
        'refresh_token' => $_SESSION['refresh_token'],
    ]);
    $_SESSION['access_token']  = $new->getToken();
    $_SESSION['refresh_token'] = $new->getRefreshToken(); // discard the old one
    $_SESSION['expires']       = $new->getExpires();
}
```

## 7. Logout

```php
$params = http_build_query([
    'id_token_hint'            => $_SESSION['id_token'] ?? '',
    'post_logout_redirect_uri' => 'https://yourapp.example.com/', // must be registered
]);
header('Location: ' . ISSUER . '/oidc/end-session?' . $params);
```

> To receive the `id_token` (for `id_token_hint`), read it from the raw token
> response: `$token->getValues()['id_token']`.
