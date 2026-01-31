# -*- coding: utf-8 -*-
import codecs

# Read the file
with codecs.open('app/admin/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace garbled text with proper emojis - using Unicode escapes
content = content.replace('\u00e2\u009e\u0095', '➕')  # plus sign
content = content.replace('\u00f0\u009f\u0093\u00a2', '📢')  # megaphone
content = content.replace('\u00f0\u009f\u0093\u008a', '📊')  # chart
content = content.replace('\u00e2\u009a\u0099\u00ef\u00b8\u008f', '⚙️')  # gear
content = content.replace('\u00f0\u009f\u0091\u00a8\u00e2\u0080\u008d\u00f0\u009f\u008e\u0093\u0022', '👨‍🎓')  # student
content = content.replace('\u00f0\u009f\u0091\u00bc', '💼')  # briefcase
content = content.replace('\u00e2\u009c\u0085', '✅')  # checkmark
content = content.replace('\u00f0\u009f\u0091\u009a', '💚')  # green heart
content = content.replace('\u00e2\u0080\u0094', '—')  # em dash

# Write back
with codecs.open('app/admin/page.tsx', 'w', encoding='utf-8-sig') as f:
    f.write(content)

print("Emojis fixed successfully!")
