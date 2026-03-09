# Genba Note 未実装タスク一覧

> 作成日: 2026-03-05
> 対象: MS1〜MS7 の残タスク（FEATURE_ROADMAP.md の将来機能は除外）
> M24-25 / MS1〜MS3 / MS6(workflows) は実装完了済み — 完了タスクは [x] で記録し残タスクを管理
> ソース: ISSUES.md, RODOAPPU.md, RELEASE_TODO.md, SYUUSEI_QUALITY.md
> 命名規則: M-XX/YY（Milestone）, M-XX-YY/ZZ（Task）

---

## ソース項目 → タスク対応表

### ISSUES.md 全項目

| Issue ID | 内容 | 状態 | 対応タスク / 除外理由 |
|----------|------|------|----------------------|
| C-1 | 利用規約・PP URL 未設定 | コード完了 / 公開未完 | コード側: 除外（完了）、公開側: M-03-01/04〜M-03-04/04 |
| C-2 | EAS Submit 設定が空 | iOS完了/Android未完（パス設定のみ） | M-02-03/07 [~] |
| C-3 | RevenueCat Public Key 未設定 | 未実施 | M-04-04/13 → M-02-04/07 |
| H-1 | Free AI検索コスト制限 | 実装完了 | 除外（canSearchAi() 実装済み） |
| H-2 | 書類累計制限が厳しすぎる | 実装完了 | 除外（FREE_DOCUMENT_LIMIT=10 に変更済み） |
| H-3 | 写真削除エラー握りつぶし | 実装完了 | 除外（エラーハンドリング追加済み） |
| H-4 | Edge Function 認証がanon key依存 | 実装完了 | 除外（auth.uid ベース認証実装済み） |
| H-5 | Rakuten レートリミッタ Map 無制限成長 | 実装完了 | 除外（TTL付きMap実装済み） |
| H-6 | ※ISSUES.md に H-6 なし | — | — |
| M-1 | `__DEV__` ガードなし console 出力 | 実装完了 | 除外（__DEV__ ガード追加済み） |
| M-2 | placeholder ProGateReason 残存 | 実装完了 | 除外（削除済み） |
| M-3 | テンプレートの Pro 差別化なし | 実装完了 | 除外（Pro専用テンプレート実装済み） |
| M-4 | 顧客登録上限が少ない | 実装完了 | 除外（FREE_CUSTOMER_LIMIT=5 に変更済み） |
| M-5 | 楽天 API RAKUTEN_APP_ID 確認 | 未確認 | M-02-05/07 |
| M-6 | 資材検索（楽天）Free回数制限 | server完了 / client実装済み | server: 除外、client: M-01-01/03（完了） |
| M-7 | Edge Function デプロイ設定手動依存 | config完了 / CI未実装 | config: 除外、CI: M-01-02/03 |
| M-8 | rakuten-search エラーログサニタイズ | 実装完了 | 除外（サニタイズ実装済み） |
| M-9 | Gemini API GEMINI_API_KEY 確認 | 未確認 | M-02-06/07 |
| M-10 | Edge Function レートリミッタ IP偽装耐性 | 実装完了 | 除外（auth.uid ベースに移行済み） |
| M-11 | CORS ワイルドカード | 実装完了 | 除外（Supabase デフォルト CORS 使用） |
| M-12 | Sentry 未導入 | SDK完了 / DSN未設定 | SDK: 除外、DSN: M-02-07/07 |
| M-13 | ストアメタデータ未作成 | 最終レビュー完了（docs/store-metadata-ja.md） | ドラフト: 除外、スクショ: M-04-07/13、レビュー: M-04-12/13 [x] |

### ISSUES.md マイルストーン対応

| MS | 内容 | 状態 | 対応タスク / 除外理由 |
|----|------|------|----------------------|
| MS1 | コード品質（M-1〜4, H-2〜3, H-5） | 全6項目完了 | 除外（完了済み） |
| MS2 | セキュリティ（H-4, M-7 config, H-1, M-10, M-6） | 全6項目完了 | M-6 client: M-01-01/03（完了） |
| MS3 | ビジネスロジック（M-8, M-11, M-3） | 全3項目完了 | 除外（完了済み） |
| MS4 | 外部サービス設定 | 未実施 | M-02/07, M-04-01/13〜M-04-04/13 |
| MS5 | ストア準備 | 一部完了（M-04-12/13, M-04-13/13完了） | M-03/07, M-04-05/13〜M-04-11/13 |
| MS6 | CI/CD + ブランチ保護 | workflows完了 | workflows: 除外、保護: M-05-01/01 |
| MS7 | リリース・提出 | 未実施 | M-01-03/03（expo-updates）, M-06/07, M-07/07 |
| MS8 | ※RODOAPPU.md のみ記載（Post-Launch） | スコープ外 | 除外（本書の対象外） |

### RELEASE_TODO.md / SYUUSEI_QUALITY.md 対応

| セクション | 内容 | 状態 | 対応タスク / 除外理由 |
|-----------|------|------|----------------------|
| M24 1-1 | setTimeout クリーンアップ | 実装完了 | 除外（完了済み） |
| M24 1-2 | 画像ファイルサイズバリデーション | 実装完了 | 除外（完了済み） |
| M24 1-3 | PDF キャッシュ孤立ファイル | 実装完了 | 除外（完了済み） |
| M25 2-1 | 利用規約・PP URL差し替え | コード完了 | 除外（コード完了、公開は M-03/07） |
| M25 2-2 | RevenueCat 本番設定 | 未実施 | M-04-02/13〜M-04-04/13, M-02-04/07 |
| M25 2-3 | App Store メタデータ | 一部完了（M-04-12/13, M-04-13/13完了） | M-04-07/13〜M-04-11/13 |
| M25 2-4 | ビルド・提出 | 未実施 | M-06/07, M-07/07 |

### RODOAPPU.md 追加項目

| セクション | 内容 | 状態 | 対応タスク / 除外理由 |
|-----------|------|------|----------------------|
| 4.1 | Apple Developer Program 登録 | 完了 | M-02-01/07 [x] |
| 4.1 | Google Play Developer 登録 | 未実施 | M-02-02/07 |
| 4.2 | ドメイン取得 | 要確認 | M-03-01/04（CNAME設定済み、DNS疎通要確認） |
| 4.2 | 静的ホスティング設定 | 要確認 | M-03-02/04（docs/にファイルあり、デプロイ要確認） |
| 4.3 | サブスクリプション価格決定 | 未実施 | M-04-01/13 |
| 4.3 | ASC サブスク商品作成 | 未実施 | M-04-02/13 |
| 4.3 | Google Play サブスク商品作成 | 未実施 | M-04-03/13 |
| 4.3 | RevenueCat 商品紐付け | 未実施 | M-04-04/13 |
| 5.1 | PP・利用規約作成 | HTML作成済み（デプロイ待ち） | M-03-03/04 [~] |
| 5.2 | App Privacy Labels | 未実施 | M-04-05/13 |
| 5.3 | Data Safety | 未実施 | M-04-06/13 |
| 5.4 | スクリーンショット撮影 | 未実施 | M-04-07/13 |
| 5.4 | 説明文・キーワード作成 | 最終レビュー完了 | M-04-12/13 [x]（docs/store-metadata-ja.md） |
| 5.5 | サブスクUIコンプライアンス | 未実施 | M-04-11/13 |
| 5.5 | 審査用メモ準備 | 未実施 | M-04-11/13 |
| 6 | CI workflows | 作成済み | 除外（test.yml, eas-build.yml 作成済み） |
| 6 | main ブランチ保護 | 未実施 | M-05-01/01 |
| 7 | 本番ビルド〜提出 | 未実施 | M-06/07, M-07/07 |
| 8 | Post-Launch（分析・改善） | スコープ外 | 除外（本書の対象外） |

---

## 命名規則

```
■ Milestone（機能単位）: M-XX/YY
  XX = Milestone番号, YY = 全Milestone数

■ Task（実装タスク）: M-XX-YY/ZZ
  XX = Milestone番号, YY = Task番号, ZZ = そのMilestone内のTask総数

■ ルール
  1. 番号は絶対に変更しない
  2. 新しい作業は番号を追加する
  3. 実装指示はTask単位で行う（例:「M-01-01/03 を実装してください」）
```

---

## 依存関係

```
M-01/07（コード修正）────────────────────────────────────┐
M-02/07（外部サービス）─┐                                  │
M-03/07（ドメイン&法務）┼→ M-04/07（ストア申請準備）────────┤
                        │                                  ├→ M-06/07（最終検証）→ M-07/07（提出）
                        │   M-04-04/13 完了後 → M-02-04/07  │
M-05/07（ブランチ保護）────────────────────────────────────┘
```

> **注**: M-02-04/07（RevenueCat EAS Secrets 登録）は M-04-04/13（商品紐付け）完了後に実施。
> M-04/07 の前提は M-02-01/07〜M-02-03/07 + M-03/07 であり、M-02-04/07 は含まない。

| Milestone / Task | 前提 | 並行可能 |
|-----------------|------|---------|
| M-01/07 | なし | M-02/07, M-03/07, M-05/07 |
| M-02-01/07 | なし | M-01/07, M-03/07, M-05/07 |
| M-02-02/07 | なし | M-01/07, M-03/07, M-05/07 |
| M-02-03/07 | M-02-01/07, M-02-02/07 | — |
| M-02-05/07〜M-02-07/07 | なし | M-01/07, M-03/07, M-05/07 |
| M-02-04/07 | M-04-04/13 | — |
| M-03/07 | なし | M-01/07, M-02/07, M-05/07 |
| M-04/07 | M-02-01/07〜M-02-03/07, M-03/07 | — |
| M-05/07 | なし | M-01/07, M-02/07, M-03/07 |
| M-06/07 | M-01/07, M-02-04/07, M-04/07, M-05/07 | — |
| M-07/07 | M-06/07 | — |

---

## 凡例

| タグ | 担当 |
|------|------|
| `[Claude]` | Claude Code で実装可能 |
| `[Human]` | 人手が必要（アカウント登録、手動テスト、外部サービス操作） |
| `[Both]` | Claude が下書き → 人がレビュー・最終判断 |

---

## M-01/07: コード残修正 `[Claude]`

> Claude が即実装可能な残りコード変更3件

| Task | 内容 | 旧Issue | 規模 | 状態 |
|------|------|---------|------|------|
| M-01-01/03 | 楽天検索 client-side Free回数制限実装 | M-6 | S | [x] |
| M-01-02/03 | CI JWT検証チェックゲート追加 | M-7 | S | [x] |
| M-01-03/03 | expo-updates 導入 & app.json設定 | MS7#1 | S | [x] |

### M-01-01/03: 楽天検索 client-side Free回数制限

- **対象**: `genba-note/src/components/unitPrice/MaterialSearchModal.tsx`
- **旧Issue M-6 の対応状況**:
  - **server-side（実装済み）**: `supabase/functions/rakuten-search/index.ts` で `DAILY_LIMIT=100`（全ユーザー共通上限）+ `auth.uid` ベース日次制限を適用中
  - **client-side（実装済み）**: `materialSearchLimitUtils.ts` の `createGuardedRakutenSearch()` 経由で `canSearchRakuten()` を使用。MaterialSearchModal で楽天検索前に日次回数チェック、超過時は Paywall 誘導、残回数バッジ表示。テスト 21件パス
- **完了条件**: `rg "canSearchRakuten" genba-note/src/components/unitPrice/materialSearchLimitUtils.ts` → ヒット + `MaterialSearchModal.rakutenLimit.test.ts` 全パス ✅

### M-01-02/03: CI JWT検証チェックゲート

- **対象**: `.github/workflows/test.yml`
- **現状（実装済み）**: `supabase/config.toml` に `verify_jwt = true` は設定済み。CIにawkベースのセクション単位JWTチェックステップ追加済み
- **修正**: test.yml に各 `[functions.*]` セクションごとの `verify_jwt = true` 検証ステップを追加
- **完了条件**: `rg "verify_jwt" .github/workflows/test.yml` → ヒット + CI green ✅

### M-01-03/03: expo-updates 導入

- **対象**: `genba-note/package.json`, `genba-note/app.json`
- **現状（実装済み）**: `expo-updates ~29.0.16` インストール済み、`app.json` に `updates` 設定 + `runtimeVersion` 設定済み
- **完了条件**: `jq '.dependencies["expo-updates"]' genba-note/package.json` → バージョン文字列 + `jq '.expo.updates' genba-note/app.json` → 非null ✅

---

## M-02/07: 外部サービスアカウント設定 `[Human]`

> 外部サービスの登録・設定。ほとんどが手動作業

| Task | 内容 | 旧Issue | 規模 | 状態 |
|------|------|---------|------|------|
| M-02-01/07 | Apple Developer Program 登録（$99/年） | MS4 | M | [x] |
| M-02-02/07 | Google Play Developer 登録（$25） | MS4 | M | [ ] |
| M-02-03/07 | EAS Submit 設定（eas.json 記入） | C-2 | S | [~] iOS完了 / Android serviceAccountKeyPath設定済み（JSONファイル未配置） |
| M-02-04/07 | RevenueCat EAS Secrets 登録 | C-3 | M | [ ] |
| M-02-05/07 | Rakuten API RAKUTEN_APP_ID 確認・登録 | M-5 | S | [ ] |
| M-02-06/07 | Gemini API GEMINI_API_KEY 確認・登録 | M-9 | S | [ ] |
| M-02-07/07 | Sentry DSN EAS環境変数設定 + テストクラッシュ確認 | M-12 | S | [ ] |

### M-02-01/07: Apple Developer Program 登録

- developer.apple.com で登録（$99/年）
- App Store Connect でアプリ作成 → App ID 取得
- M-02-03/07（EAS Submit 設定）の前提条件
- **完了条件**: App Store Connect でアプリが「準備中」ステータスで存在 + Apple Team ID 取得済み

### M-02-02/07: Google Play Developer 登録

- play.google.com/console で登録（$25 一回）
- アプリ作成 → サービスアカウント JSON 生成
- M-02-03/07（EAS Submit 設定）の前提条件
- **完了条件**: Google Play Console でアプリが作成済み + サービスアカウント JSON ファイル取得済み

### M-02-03/07: EAS Submit 設定 [~]

- **対象**: `genba-note/eas.json`
- **iOS（完了）**: `submit.production.ios` に `appleId`, `ascAppId`, `appleTeamId` 記入済み
- **Android（部分完了）**: `submit.production.android` に `serviceAccountKeyPath: "./google-service-account.json"` 設定済みだが、JSONファイル自体は未配置（M-02-02/07 完了後に取得・配置が必要）
- **前提**: M-02-01/07 ✅, M-02-02/07（Android側の完了に必要）
- **完了条件**: iOS: `jq -e '.submit.production.ios | (.appleId | type=="string" and length>0) and (.ascAppId | type=="string" and length>0) and (.appleTeamId | type=="string" and length>0)' genba-note/eas.json` → `true`（exit 0） ✅ / Android: `ls genba-note/google-service-account.json` → ファイル存在

### M-02-04/07: RevenueCat EAS Secrets 登録

- **役割**: RevenueCat Public Key を EAS Secrets に登録する（プロジェクト作成・商品紐付けは M-04-04/13 で実施）
- RevenueCat ダッシュボードから Public Key を取得
- `eas secret:create --name EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY --value <key>`
- `.env` にも `EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY=<key>` を設定
- **前提**: M-04-04/13（RevenueCat 商品紐付け）完了
- **完了条件**: `eas secret:list` で `EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY` が存在 + 実機ビルドで RevenueCat 初期化成功

### M-02-05/07: Rakuten API RAKUTEN_APP_ID 確認

- `supabase secrets list` で `RAKUTEN_APP_ID` の存在を確認
- 未登録なら [Rakuten Developers](https://webservice.rakuten.co.jp/) でアプリ登録 → `supabase secrets set`
- **完了条件**: `supabase secrets list` に `RAKUTEN_APP_ID` が表示 + 本番環境で楽天検索が結果を返す

### M-02-06/07: Gemini API GEMINI_API_KEY 確認

- `supabase secrets list` で `GEMINI_API_KEY` の存在を確認
- 未登録なら Google AI Studio でキー取得 → `supabase secrets set GEMINI_API_KEY=<key>`
- 本番環境で AI 検索の疎通テストを実施
- **完了条件**: `supabase secrets list` に `GEMINI_API_KEY` が表示 + 本番環境で AI 資材検索が結果を返す

### M-02-07/07: Sentry DSN EAS環境変数設定

- EAS Build の環境変数に `EXPO_PUBLIC_SENTRY_DSN` を設定
- テストクラッシュでダッシュボード受信確認
- **完了条件**: `eas secret:list` に `EXPO_PUBLIC_SENTRY_DSN` が表示 + Sentry ダッシュボードにテストイベント受信

---

## M-03/07: ドメイン & 法務文書 `[Human/Both]`

> ストア申請に必須。法務文書はClaude下書き → 人レビュー

| Task | 内容 | 旧Issue | 規模 | 状態 |
|------|------|---------|------|------|
| M-03-01/04 | genba-note.app ドメイン取得 | RODOAPPU 4.2 | S | [?] CNAME設定済み（DNS疎通要確認） |
| M-03-02/04 | 静的ホスティング設定（GitHub Pages / Vercel 等） | RODOAPPU 4.2 | S | [?] docs/にCNAME・HTMLあり（デプロイ・HTTPS要確認） |
| M-03-03/04 | プライバシーポリシー & 利用規約の HTML 作成・デプロイ | RODOAPPU 5.1 | M | [~] HTML作成済み、デプロイはM-03-02/04依存 |
| M-03-04/04 | URL公開確認（HTTP 200 疎通テスト） | RODOAPPU 5.1 | S | [ ] デプロイ後に確認 |

### M-03-01/04: ドメイン取得

- **完了条件**: `dig genba-note.app` → DNS レコードが存在

### M-03-02/04: 静的ホスティング設定

- **完了条件**: ドメインに HTTPS でアクセス可能（`curl -sI https://genba-note.app | head -1` → `HTTP/2 200` or redirect）

> **注**: ISSUES.md C-1（コード内URL差し替え & TODO削除）は実装完了済み。`src/constants/legalUrls.ts` に `genba-note.app/terms` と `genba-note.app/privacy` が設定済み。残タスクはドメイン取得〜ページ公開のインフラ側のみ。

### M-03-03/04: プライバシーポリシー & 利用規約 HTML 作成・デプロイ

プライバシーポリシー記載必須事項:
- ローカルデータ保存（AsyncStorage, SecureStore）の説明
- 外部送信データの開示: RevenueCat（購入情報）、Gemini API（検索クエリ）、Rakuten API（検索クエリ）、Sentry（クラッシュレポート）、Supabase Auth（匿名UUID）
- サーバーにユーザーアカウント・個人データは保存しない旨
- 個人情報保護法（日本）への準拠

利用規約記載必須事項:
- 自動更新サブスクリプション条項（Apple/Google 必須要件）
- 解約方法の説明
- 見積書・請求書の金額精度に関する免責

- **完了条件**: HTML がホスティング先にデプロイ済み + 上記必須事項が各ページに記載されていることを目視確認

### M-03-04/04: URL公開確認

- **完了条件**:
  - `curl -s -o /dev/null -w "%{http_code}" https://genba-note.app/terms` → `200`
  - `curl -s -o /dev/null -w "%{http_code}" https://genba-note.app/privacy` → `200`
  - `genba-note/src/constants/legalUrls.ts` のURLが公開URLと一致（確認済み）

---

## M-04/07: ストア申請準備 `[Human/Both]`

> IAP商品設定、プライバシーラベル、メタデータ最終化

| Task | 内容 | 旧Issue | 規模 | 状態 |
|------|------|---------|------|------|
| M-04-01/13 | サブスクリプション価格決定 | MS4 | S | [ ] |
| M-04-02/13 | App Store Connect サブスク商品作成 | MS4 | M | [ ] |
| M-04-03/13 | Google Play Console サブスク商品作成 | MS4 | M | [ ] |
| M-04-04/13 | RevenueCat プロジェクト作成 + 商品紐付け（Entitlement `pro` + Offering） | MS4 | M | [ ] |
| M-04-05/13 | App Privacy Labels（Apple）申告 | MS5 | S | [ ] |
| M-04-06/13 | Data Safety（Google Play）フォーム記入 | MS5 | S | [ ] |
| M-04-07/13 | スクリーンショット撮影（iPhone 6.7"/6.5"/iPad/Android） | M-13/MS5 | M | [ ] |
| M-04-08/13 | アプリアイコン作成（1024x1024） | RELEASE_TODO | S | [ ] |
| M-04-09/13 | App Store カテゴリ・年齢制限・サポートURL 設定 | RELEASE_TODO | S | [ ] |
| M-04-10/13 | Google Play カテゴリ・コンテンツレーティング設定 | RELEASE_TODO | S | [ ] |
| M-04-11/13 | サブスクUIコンプライアンス確認 + 審査用メモ準備 | MS5 | S | [ ] |
| M-04-12/13 | 説明文・キーワード最終レビュー | M-13/MS5 | S | [x] 最終レビュー完了（キーワード拡充・説明文ブラッシュアップ・Pro機能詳細化） |
| M-04-13/13 | アプリ名・サブタイトル最終確認 | RELEASE_TODO | S | [x] "Genba Note" に統一確認済み |

### M-04-01/13: サブスクリプション価格決定

- **完了条件**: 月額・年額の価格が確定し、文書化されている（例: 月額¥1,980 / 年額¥19,800）

### M-04-02/13: App Store Connect サブスク商品作成

- **完了条件**: App Store Connect で月額・年額の自動更新サブスクリプション商品が「提出可能」ステータス

### M-04-03/13: Google Play Console サブスク商品作成

- **完了条件**: Google Play Console で月額・年額の定期購入商品が作成済み

### M-04-04/13: RevenueCat プロジェクト作成 + 商品紐付け

- RevenueCat プロジェクト作成、Apple/Google アプリ接続
- Entitlement `pro` 作成、Offering にサブスク商品を紐付け
- **完了条件**: RevenueCat ダッシュボードで Entitlement `pro` と Offering（月額・年額）が設定済み + Products に Apple/Google 商品が紐付け済み

### M-04-05/13: App Privacy Labels

収集するデータ:
- 購入情報: サブスクリプション状態（RevenueCat経由、ユーザーに紐付け）
- 診断データ: クラッシュレポート（Sentry経由、ユーザーに紐付けなし）
- 識別子: Supabase匿名認証UUID（検索機能の利用制限用）
- 検索履歴: AI資材検索・楽天検索のクエリ
- **完了条件**: App Store Connect のプライバシーラベルセクションが提出済み

### M-04-06/13: Data Safety

- データ暗号化（転送時）: はい（TLS）
- データ削除リクエスト: アプリのアンインストールで端末内データ全削除
- 共有するデータ: 購入情報（RevenueCat）、診断データ（Sentry）
- **完了条件**: Google Play Console の Data Safety フォームが提出済み

### M-04-07/13: スクリーンショット

必要サイズ:
- iPhone 6.7"（必須）
- iPhone 6.5"（必須）
- iPad 12.9"（`supportsTablet: true` のため必須）
- Android スマートフォン

最低5枚: 書類一覧 → 書類作成 → PDFプレビュー → 課金画面 → 資材検索
- **完了条件**: 各サイズのスクリーンショット（5枚以上）が App Store Connect / Google Play Console にアップロード済み

### M-04-08/13: アプリアイコン

- 1024x1024 PNG（アルファチャンネルなし）
- App Store Connect / Google Play Console にアップロード
- **完了条件**: 両ストアのアプリ情報ページにアイコンが表示されている

### M-04-09/13: App Store カテゴリ・年齢制限・サポートURL

- プライマリカテゴリ: ビジネス、セカンダリ: 仕事効率化
- 年齢制限: 4+
- サポートURL: https://genba-note.app
- **完了条件**: App Store Connect でカテゴリ・年齢制限・サポートURLが設定済み

### M-04-10/13: Google Play カテゴリ・コンテンツレーティング

- カテゴリ: ビジネス
- コンテンツレーティング: 全ユーザー対象
- **完了条件**: Google Play Console でカテゴリ選択・レーティングアンケート提出済み

### M-04-11/13: コンプライアンス + 審査メモ

- Apple Guideline 3.1.2: 購入画面に価格・期間・解約方法を明記
- 審査用メモ: アプリ機能説明、デモアカウント不要（認証なし）、Pro機能の説明
- **完了条件**: paywall.tsx の購入画面に価格・期間・解約方法が表示されている + App Store Connect の審査メモ欄に記入済み

### M-04-12/13: 説明文・キーワード最終レビュー [x]

- docs/store-metadata-ja.md を最終レビュー・ブラッシュアップ完了（2026-03-06）
- キーワード拡充（業種系9語追加、95/100文字）、説明文にPro機能詳細・楽天検索を追記
- **完了条件**: docs/store-metadata-ja.md の説明文・キーワードが最終レビュー済み ✅
- **残作業**: ストア申請時に docs/store-metadata-ja.md の内容を各ストアにコピー入力（M-07/07 提出時）

### M-04-13/13: アプリ名・サブタイトル最終確認 [x]

- App Store: アプリ名「Genba Note」、サブタイトル「建設業の見積書・請求書をかんたん作成」（18/30文字）
- Google Play: アプリ名「Genba Note - 建設業見積・請求書」（22/30文字）
- app.json の "Genba Note" と一致確認済み
- **完了条件**: アプリ名が app.json・メタデータ文書で統一済み ✅
- **残作業**: ストア申請時に各ストアへ入力（M-07/07 提出時）

---

## M-05/07: ブランチ保護 `[Human]`

| Task | 内容 | 旧Issue | 規模 | 状態 |
|------|------|---------|------|------|
| M-05-01/01 | main ブランチ保護設定 | MS6 | S | [ ] |

### M-05-01/01: ブランチ保護設定

- GitHub Settings → Branches → Add rule
- PRレビュー必須
- ステータスチェック（test workflow）パス必須
- **完了条件**: `gh api repos/{owner}/{repo}/branches/main/protection` → PRレビュー必須 + ステータスチェック必須が有効

---

## M-06/07: リリース前最終検証 `[Human/Both]`

> M-01/07, M-02-04/07, M-04/07, M-05/07 完了後に着手

| Task | 内容 | 旧Issue | 規模 | 状態 |
|------|------|---------|------|------|
| M-06-01/06 | iOS / Android 本番ビルド | MS7 | M | [ ] |
| M-06-02/06 | iOS サンドボックス課金テスト | MS7 | M | [ ] |
| M-06-03/06 | Android テストトラック課金テスト | MS7 | M | [ ] |
| M-06-04/06 | TestFlight / 内部テスト配信 | MS7 | M | [ ] |
| M-06-05/06 | 実機フルフロー確認 | MS7 | M | [ ] |
| M-06-06/06 | 最終回帰テスト（全テスト + 実機E2E） | MS7 | M | [ ] |

### M-06-01/06: 本番ビルド

- `eas build --profile production --platform all`
- **完了条件**: EAS ダッシュボードで iOS / Android 両ビルドが `finished` ステータス

### M-06-02/06: iOS サンドボックス課金テスト

- Apple Sandbox テスターアカウント作成
- テスト項目: 月額購入 → 復元 → 解約 → 年額購入
- RevenueCat ダッシュボードでイベント受信確認
- **完了条件**: 購入・復元・解約の各操作が成功 + RevenueCat に対応イベント4件以上受信

### M-06-03/06: Android テストトラック課金テスト

- Google Play ライセンステスター設定
- 同様のテスト項目を実施
- **完了条件**: 購入・復元・解約の各操作が成功 + RevenueCat に対応イベント受信

### M-06-04/06: TestFlight / 内部テスト配信

- **完了条件**: TestFlight でテスターがアプリをインストール可能 + Google Play 内部テストトラックで配信済み

### M-06-05/06: 実機フルフロー確認

- 書類作成 → 編集 → PDFプレビュー → PDF共有
- 顧客登録 → 写真添付
- 資材検索（AI / 楽天）
- 課金 → Pro機能解放 → 復元
- カレンダー（予定管理）
- 収支管理
- 設定（発行者情報・テンプレート選択・背景デザイン）
- **完了条件**: 上記全フローを iOS / Android 実機で実施し、致命的バグなし

### M-06-06/06: 最終回帰テスト

- `cd genba-note && npx jest` → 0 failures
- `cd genba-note && npx tsc --noEmit` → exit code 0
- **完了条件**: 上記2コマンドが exit code 0

---

## M-07/07: ストア提出 `[Human]`

> M-06/07 完了後に着手

| Task | 内容 | 旧Issue | 規模 | 状態 |
|------|------|---------|------|------|
| M-07-01/03 | App Store 審査提出 | MS7 | — | [ ] |
| M-07-02/03 | Play Store 審査提出 | MS7 | — | [ ] |
| M-07-03/03 | 審査対応（リジェクト時の修正・再提出） | MS7 | — | [ ] |

### M-07-01/03: App Store 審査提出

- `eas submit --platform ios`
- **完了条件**: App Store Connect でステータスが「審査待ち」または「審査中」

### M-07-02/03: Play Store 審査提出

- `eas submit --platform android`
- **完了条件**: Google Play Console でステータスが「審査中」

### M-07-03/03: 審査対応

- リジェクト時の修正・再提出（1〜3回は想定）
- **完了条件**: 両ストアでアプリが「公開」ステータス

---

## 最終ゲートチェックリスト

ストア提出前に全て完了であること:

**M-01/07 コード修正:**
- [x] M-01-01/03: `canSearchRakuten()` が MaterialSearchModal で使用されている
- [x] M-01-02/03: CI で `verify_jwt = true` がチェックされている
- [x] M-01-03/03: `expo-updates` がインストール済み + app.json に updates 設定あり
- [ ] `cd genba-note && npx jest` → 0 failures
- [ ] `cd genba-note && npx tsc --noEmit` → exit code 0
- [ ] `deno check supabase/functions/*/index.ts` → exit code 0

**M-02/07 外部サービス:**
- [x] M-02-01/07: App Store Connect でアプリが存在 + Apple Team ID 取得済み
- [ ] M-02-02/07: Google Play Console でアプリが作成済み + サービスアカウント JSON 取得済み
- [~] M-02-03/07: EAS Submit 設定 iOS完了、Android serviceAccountKeyPath設定済み（JSONファイル未配置）
- [ ] M-02-04/07: `eas secret:list` に `EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY` が存在
- [ ] M-02-05/07: `supabase secrets list` に `RAKUTEN_APP_ID` が存在
- [ ] M-02-06/07: `supabase secrets list` に `GEMINI_API_KEY` が存在
- [ ] M-02-07/07: Sentry でテストクラッシュイベント受信確認済み

**M-03/07 ドメイン & 法務:**
- [ ] M-03-01/04: `dig genba-note.app` → DNS レコードが存在
- [ ] M-03-02/04: `curl -sI https://genba-note.app` → HTTPS アクセス可能
- [~] M-03-03/04: PP・利用規約 HTML 作成済み（デプロイは M-03-02/04 完了後）
- [ ] M-03-04/04: `https://genba-note.app/terms` → HTTP 200
- [ ] M-03-04/04: `https://genba-note.app/privacy` → HTTP 200

**M-04/07 ストア申請準備:**
- [ ] M-04-01/13: サブスクリプション価格が確定・文書化済み
- [ ] M-04-02/13: App Store Connect でサブスク商品が作成済み
- [ ] M-04-03/13: Google Play Console でサブスク商品が作成済み
- [ ] M-04-04/13: RevenueCat で Pro Entitlement + Offering が設定済み
- [ ] M-04-05/13: App Privacy Labels（Apple）提出済み
- [ ] M-04-06/13: Data Safety（Google Play）提出済み
- [ ] M-04-07/13: スクリーンショットが両ストアにアップロード済み
- [ ] M-04-08/13: アプリアイコンが両ストアにアップロード済み
- [ ] M-04-09/13: App Store カテゴリ・年齢制限・サポートURL 設定済み
- [ ] M-04-10/13: Google Play カテゴリ・コンテンツレーティング設定済み
- [ ] M-04-11/13: paywall の UI にサブスク情報が明記 + 審査メモ記入済み
- [x] M-04-12/13: 説明文・キーワード最終レビュー完了（docs/store-metadata-ja.md）
- [x] M-04-13/13: アプリ名 "Genba Note" に統一確認済み（docs/store-metadata-ja.md）

**M-05/07 ブランチ保護:**
- [x] `.github/workflows/test.yml` がリポジトリに存在する（実装済み）
- [x] `.github/workflows/eas-build.yml` がリポジトリに存在する（実装済み）
- [ ] M-05-01/01: main ブランチ保護が有効（PRレビュー + ステータスチェック必須）

**M-06/07 最終検証:**
- [ ] M-06-01/06: iOS / Android 本番ビルド成功
- [ ] M-06-02/06: iOS サンドボックスで課金フロー（購入・復元・解約）動作確認済み
- [ ] M-06-03/06: Android テストトラックで課金フロー動作確認済み
- [ ] M-06-04/06: TestFlight / 内部テストで配信済み
- [ ] M-06-05/06: 実機で全主要フロー動作確認済み
- [ ] M-06-06/06: 最終回帰テスト（jest + tsc）パス

**M-07/07 ストア提出:**
- [ ] M-07-01/03: App Store Connect でステータスが「審査待ち」または「審査中」
- [ ] M-07-02/03: Google Play Console でステータスが「審査中」
- [ ] M-07-03/03: 両ストアでアプリが「公開」ステータス

---

## サマリー

| Milestone | タスク数 | 担当 | 状態 |
|-----------|---------|------|------|
| M-01/07 コード残修正 | 3 | `[Claude]` | 完了 |
| M-02/07 外部サービス設定 | 7 | `[Human]` | 1/7完了+1部分完了（Apple Dev登録[x], EAS Submit[~]） |
| M-03/07 ドメイン&法務 | 4 | `[Human/Both]` | 0/4完了+3件部分/要確認（ドメイン[?], ホスティング[?], HTML作成済み[~]） |
| M-04/07 ストア申請準備 | 13 | `[Human/Both]` | 2/13（M-04-12/13, M-04-13/13 完了） |
| M-05/07 ブランチ保護 | 1 | `[Human]` | 未着手 |
| M-06/07 最終検証 | 6 | `[Human/Both]` | 未着手 |
| M-07/07 ストア提出 | 3 | `[Human]` | 未着手 |
| **合計** | **37** | | |
