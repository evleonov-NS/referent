$BaseUrl = if ($env:REFERENT_BASE_URL) { $env:REFERENT_BASE_URL } else { "http://localhost:3000" }
$ArticleUrl = "https://cursor.com/blog/composer-2-5"
$Letter = @"
Hey Evgen,

First off, sorry for missing last month's update. I'll make up for it with this one and the upcoming updates. Hoverify 4.8.1 brings SEO report PDF exports, input syncing in Responsive, Library search, and a faster screenshot editor rebuilt on Konva.

I put together a short video walkthrough covering the major changes, give it a watch when you get a chance.

If your license key has expired or is coming up on renewal, I'd really appreciate your continued support. I'm shipping updates every month and there's a lot more planned. You can renew from your Dashboard.

Also, if Hoverify has been useful to you, a quick review on the Chrome Store, Firefox Store, or Trustpilot would mean a lot. It genuinely helps other people find the tool.
"@

function Invoke-ApiTest {
    param(
        [string]$Name,
        [string]$Endpoint,
        [object]$Body,
        [string]$ResultKey
    )

    Write-Host "`n=== $Name ===" -ForegroundColor Cyan
    try {
        $json = $Body | ConvertTo-Json -Depth 5
        $response = Invoke-RestMethod -Uri "$BaseUrl$Endpoint" -Method POST -Body $json -ContentType "application/json; charset=utf-8" -TimeoutSec 180
        $text = $response.$ResultKey
        if ([string]::IsNullOrWhiteSpace($text)) {
            Write-Host "FAIL: пустой $ResultKey" -ForegroundColor Red
            return $false
        }
        Write-Host "OK: $ResultKey length = $($text.Length)" -ForegroundColor Green
        Write-Host ($text.Substring(0, [Math]::Min(400, $text.Length)))
        if ($text.Length -gt 400) { Write-Host "..." }
        return $true
    }
    catch {
        Write-Host "FAIL: $($_.ErrorDetails.Message)" -ForegroundColor Red
        if (-not $_.ErrorDetails.Message) { Write-Host $_.Exception.Message -ForegroundColor Red }
        return $false
    }
}

Write-Host "Base URL: $BaseUrl"

$parsed = Invoke-RestMethod -Uri "$BaseUrl/api/parse-article" -Method POST -Body (@{ url = $ArticleUrl } | ConvertTo-Json) -ContentType "application/json; charset=utf-8" -TimeoutSec 60
Write-Host "`n=== Parse article ===" -ForegroundColor Cyan
Write-Host "title: $($parsed.title)"
Write-Host "content length: $($parsed.content.Length)"

$articleBody = @{
    text    = $parsed.content
    title   = $parsed.title
    date    = $parsed.date
}

$results = @()
$results += Invoke-ApiTest -Name "Summary" -Endpoint "/api/summarize-article" -Body $articleBody -ResultKey "summary"
$results += Invoke-ApiTest -Name "Theses" -Endpoint "/api/article-theses" -Body $articleBody -ResultKey "theses"
Write-Host "`n=== Translate article ===" -ForegroundColor Cyan
try {
    $json = $articleBody | ConvertTo-Json -Depth 5
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/translate-article" -Method POST -Body $json -ContentType "application/json; charset=utf-8" -TimeoutSec 600
    $text = $response.translation
    if ([string]::IsNullOrWhiteSpace($text)) {
        Write-Host "FAIL: пустой translation" -ForegroundColor Red
        $results += $false
    } else {
        Write-Host "OK: translation length = $($text.Length)" -ForegroundColor Green
        Write-Host ($text.Substring(0, [Math]::Min(400, $text.Length)))
        if ($text.Length -gt 400) { Write-Host "..." }
        $results += $true
    }
}
catch {
    Write-Host "FAIL: $($_.ErrorDetails.Message)" -ForegroundColor Red
    if (-not $_.ErrorDetails.Message) { Write-Host $_.Exception.Message -ForegroundColor Red }
    $results += $false
}

$letterBody = @{ text = $Letter }
$results += Invoke-ApiTest -Name "Translate letter" -Endpoint "/api/translate-letter" -Body $letterBody -ResultKey "translation"
$results += Invoke-ApiTest -Name "Prepare reply" -Endpoint "/api/prepare-letter-reply" -Body $letterBody -ResultKey "replyOriginal"

$passed = ($results | Where-Object { $_ }).Count
$total = $results.Count
Write-Host "`nИтого: $passed / $total" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })
if ($passed -ne $total) { exit 1 }
