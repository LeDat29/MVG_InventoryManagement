# KHO MVG - Full Test Checklist
Write-Host "🚀 STARTING FULL TEST CHECKLIST - KHO MVG" -ForegroundColor Green
Write-Host "=" * 60

$results = @()

# Test 1: Server Health
Write-Host "🔍 Testing Server Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Server Health: PASS" -ForegroundColor Green
        $results += "Server Health: PASS"
    } else {
        Write-Host "❌ Server Health: FAIL" -ForegroundColor Red
        $results += "Server Health: FAIL"
    }
} catch {
    Write-Host "❌ Server Health: FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $results += "Server Health: FAIL"
}

# Test 2: Frontend Health
Write-Host "🔍 Testing Frontend Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend Health: PASS" -ForegroundColor Green
        $results += "Frontend Health: PASS"
    } else {
        Write-Host "❌ Frontend Health: FAIL" -ForegroundColor Red
        $results += "Frontend Health: FAIL"
    }
} catch {
    Write-Host "❌ Frontend Health: FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $results += "Frontend Health: FAIL"
}

# Test 3: Login Test
Write-Host "🔍 Testing Admin Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $loginData = $response.Content | ConvertFrom-Json
    
    if ($loginData.success -and $loginData.token) {
        Write-Host "✅ Admin Login: PASS" -ForegroundColor Green
        $results += "Admin Login: PASS"
        $global:authToken = $loginData.token
        
        # Test 4: Users API with Token
        Write-Host "🔍 Testing Users API..." -ForegroundColor Yellow
        $headers = @{
            "Authorization" = "Bearer $($loginData.token)"
            "Content-Type" = "application/json"
        }
        
        $usersResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/users" -Method GET -Headers $headers
        $usersData = $usersResponse.Content | ConvertFrom-Json
        
        if ($usersData.success) {
            Write-Host "✅ Users API: PASS - Found $($usersData.data.Count) users" -ForegroundColor Green
            $results += "Users API: PASS"
        } else {
            Write-Host "❌ Users API: FAIL" -ForegroundColor Red
            $results += "Users API: FAIL"
        }
        
        # Test 5: AI Config API
        Write-Host "🔍 Testing AI Config API..." -ForegroundColor Yellow
        try {
            $aiResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/ai-assistant/providers" -Method GET -Headers $headers
            $aiData = $aiResponse.Content | ConvertFrom-Json
            
            if ($aiData.success -and $aiData.data.free_providers) {
                $freeCount = $aiData.data.free_providers.Count
                Write-Host "✅ AI Config: PASS - Found $freeCount free providers" -ForegroundColor Green
                $results += "AI Config: PASS"
            } else {
                Write-Host "⚠️ AI Config: WARN - No free providers found" -ForegroundColor Yellow
                $results += "AI Config: WARN"
            }
        } catch {
            Write-Host "⚠️ AI Config: WARN - API not available" -ForegroundColor Yellow
            $results += "AI Config: WARN"
        }
        
    } else {
        Write-Host "❌ Admin Login: FAIL - $($loginData.message)" -ForegroundColor Red
        $results += "Admin Login: FAIL"
        Write-Host "⏭️ Skipping authenticated tests" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Admin Login: FAIL - $($_.Exception.Message)" -ForegroundColor Red
    $results += "Admin Login: FAIL"
}

# Summary
Write-Host "`n" + "=" * 60
Write-Host "📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 60

$passed = ($results | Where-Object { $_ -like "*PASS*" }).Count
$failed = ($results | Where-Object { $_ -like "*FAIL*" }).Count
$warnings = ($results | Where-Object { $_ -like "*WARN*" }).Count

Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "❌ Failed: $failed" -ForegroundColor Red
Write-Host "⚠️ Warnings: $warnings" -ForegroundColor Yellow
Write-Host "📊 Total: $($results.Count)" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "`n🎉 ALL CRITICAL TESTS PASSED! System is ready for use." -ForegroundColor Green
} else {
    Write-Host "`n🔧 Some tests failed. Please check the issues above." -ForegroundColor Red
}

Write-Host "`n📋 DETAILED RESULTS:" -ForegroundColor Cyan
$results | ForEach-Object { Write-Host "  - $_" }