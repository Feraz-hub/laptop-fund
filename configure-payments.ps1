param([switch]$Check)
$ErrorActionPreference = 'Stop'
$configPath = Join-Path $PSScriptRoot '.env'
$config = [ordered]@{}
if (Test-Path -LiteralPath $configPath) {
    foreach ($line in [IO.File]::ReadAllLines($configPath)) {
        if ($line -match '^([A-Z_]+)=(.*)$') { $config[$Matches[1]] = $Matches[2] }
    }
}
if ($Check) {
    [PSCustomObject]@{
        LocalConfigExists = (Test-Path -LiteralPath $configPath)
        TestKeyConfigured = [bool]($config['FLW_SECRET_KEY'] -match '^FLWSECK_TEST-')
        WebhookSecretConfigured = [bool]$config['FLW_SECRET_HASH']
        Mode = if ($config['PAYMENT_MODE']) { $config['PAYMENT_MODE'] } else { 'not configured' }
    } | Format-List
    exit 0
}
if ($config['PAYMENT_MODE'] -eq 'live') {
    throw 'This helper configures local testing only. Existing live configuration was left unchanged.'
}
Write-Host 'Paste your Flutterwave V3 TEST secret key below. Input is hidden.'
Write-Host 'This saves the key locally in .env, which is ignored by Git. Do not share that file.'
$hiddenKey = Read-Host 'Test secret key' -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($hiddenKey)
try { $testKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer) }
try {
    $testKey = $testKey.Trim()
    if ($testKey -notmatch '^FLWSECK_TEST-[A-Za-z0-9_-]+$') {
        throw 'That is not a V3 test secret key. No configuration was changed.'
    }
    $config['FLW_SECRET_KEY'] = $testKey
    if (-not $config['FLW_SECRET_HASH']) {
        $randomBytes = New-Object byte[] 32
        $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $generator.GetBytes($randomBytes) } finally { $generator.Dispose() }
        $config['FLW_SECRET_HASH'] = [BitConverter]::ToString($randomBytes).Replace('-', '').ToLowerInvariant()
    }
    $config['PAYMENT_MODE'] = 'test'
    if (-not $config['PORT']) { $config['PORT'] = '4173' }
    if (-not $config['PUBLIC_ORIGIN']) { $config['PUBLIC_ORIGIN'] = 'http://127.0.0.1:' + $config['PORT'] }
    if (-not $config['HOST']) { $config['HOST'] = '127.0.0.1' }
    if (-not $config['DATA_DIRECTORY']) { $config['DATA_DIRECTORY'] = './data' }
    $lines = @('# Private local configuration. Do not commit or share this file.')
    foreach ($entry in $config.GetEnumerator()) { $lines += $entry.Key + '=' + $entry.Value }
    [IO.File]::WriteAllLines($configPath, $lines, (New-Object Text.UTF8Encoding $false))
    Write-Host 'Test configuration saved. Your key was not printed.'
    Write-Host 'Next: run npm run payments:check, then restart npm start.'
} finally {
    $testKey = $null
    $hiddenKey.Dispose()
}
