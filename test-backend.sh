#!/bin/bash
# 快速测试 Render 后端服务

BASE_URL="https://draw-kkmt.onrender.com"

echo "=========================================="
echo "测试 Render 后端服务"
echo "URL: $BASE_URL"
echo "=========================================="
echo ""

# 测试 1: 健康检查
echo "1. 测试健康检查..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 健康检查通过"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
    echo "❌ 健康检查失败 (HTTP $HTTP_CODE)"
    echo "$BODY"
    exit 1
fi
echo ""

# 测试 2: 保存数据
echo "2. 测试保存数据..."
TEST_DATA='{"test": "data", "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"}'
SAVE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/v2/post" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "$TEST_DATA")
HTTP_CODE=$(echo "$SAVE_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$SAVE_RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 保存数据成功"
    ID=$(echo "$BODY" | jq -r '.id' 2>/dev/null)
    if [ -n "$ID" ] && [ "$ID" != "null" ]; then
        echo "   数据 ID: $ID"
        echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    else
        echo "❌ 响应中没有 ID"
        echo "$BODY"
        exit 1
    fi
else
    echo "❌ 保存数据失败 (HTTP $HTTP_CODE)"
    echo "$BODY"
    exit 1
fi
echo ""

# 测试 3: 获取数据
if [ -n "$ID" ] && [ "$ID" != "null" ]; then
    echo "3. 测试获取数据 (ID: $ID)..."
    GET_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/v2/get/$ID")
    HTTP_CODE=$(echo "$GET_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$GET_RESPONSE" | sed '/HTTP_CODE/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ 获取数据成功"
        # 尝试解析 JSON
        echo "$BODY" | jq . 2>/dev/null || echo "   数据长度: $(echo -n "$BODY" | wc -c) 字节"
    else
        echo "❌ 获取数据失败 (HTTP $HTTP_CODE)"
        echo "$BODY"
        exit 1
    fi
    echo ""
    
    # 测试 4: 删除数据
    echo "4. 测试删除数据 (ID: $ID)..."
    DELETE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE "$BASE_URL/v2/delete/$ID")
    HTTP_CODE=$(echo "$DELETE_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
    BODY=$(echo "$DELETE_RESPONSE" | sed '/HTTP_CODE/d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ 删除数据成功"
        echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    else
        echo "❌ 删除数据失败 (HTTP $HTTP_CODE)"
        echo "$BODY"
    fi
    echo ""
fi

echo "=========================================="
echo "✅ 所有测试完成！"
echo "=========================================="

