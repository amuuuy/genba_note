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

        <Text style={styles.sectionTitle}>クラッシュレポートについて</Text>
        <Text style={styles.body}>
          アプリが予期せず終了した場合に限り、
          匿名化されたクラッシュレポート（端末情報・エラー内容）が
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
          銀行口座情報等の機密データは、
          端末のセキュアストレージ（expo-secure-store）を使用して保護されます。
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
