import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';

export default function DataHandlingScreen() {
  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text style={styles.title}>データ取扱説明</Text>

        <Text style={styles.sectionTitle}>データの保存先</Text>
        <Text style={styles.body}>
          本アプリで作成した書類・顧客・写真などのデータは、
          すべて端末内のローカルストレージに保存されます。
          業務データが開発者のサーバーや外部サービスに送信されることはありません。
        </Text>

        <Text style={styles.sectionTitle}>保存場所の詳細</Text>
        <Text style={styles.body}>
          ・通常ストレージ（AsyncStorage）: 書類・顧客・単価・収支・予定などの業務データ、
          発行者情報（会社名・住所・電話番号・メール等）、アプリ設定、画像の URI/メタデータ{'\n'}
          ・セキュアストレージ（SecureStore: iOS Keychain / Android Keystore）:
          適格請求書発行事業者番号と銀行口座情報のみを暗号化して保存{'\n'}
          ・アプリ専用ディレクトリ: 印影画像・背景画像・顧客写真・領収書写真などの画像ファイル本体
        </Text>

        <Text style={styles.sectionTitle}>エラーレポートについて</Text>
        <Text style={styles.body}>
          アプリで予期しないエラーが発生した場合に、
          匿名化されたエラーレポート（端末情報・エラー内容・スタックトレース）が
          品質改善のため外部サービス（Sentry）に送信されます。
          個人を特定できる情報や業務データは含まれません。
        </Text>

        <Text style={styles.sectionTitle}>バックアップについて</Text>
        <Text style={styles.body}>
          端末のiCloud/Googleバックアップ設定によっては、
          アプリデータがクラウドにバックアップされる場合があります。
        </Text>

        <Text style={styles.sectionTitle}>機密情報の扱い</Text>
        <Text style={styles.body}>
          適格請求書発行事業者番号と銀行口座情報のみ、
          端末のセキュアストレージ（expo-secure-store: iOS Keychain / Android Keystore）を
          使用して暗号化保護されます。これらは「保存場所の詳細」のセキュアストレージ項目に該当します。
        </Text>

        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeButtonText}>閉じる</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
  closeButton: {
    alignSelf: 'center',
    padding: 16,
    marginTop: 32,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
