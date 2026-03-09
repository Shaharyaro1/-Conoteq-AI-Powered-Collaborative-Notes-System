// Test Notification System
// Copy paste this in browser console to debug

console.log('=== NOTIFICATION DEBUG TEST ===\n');

// 1. Check uploaded notes
const uploadedNotes = localStorage.getItem('uploadedNotes');
console.log('1. Uploaded Notes:', uploadedNotes ? JSON.parse(uploadedNotes) : 'No notes found');

// 2. Check last status check
const lastStatusCheck = localStorage.getItem('userLastStatusCheck');
console.log('\n2. Last Status Check:', lastStatusCheck ? JSON.parse(lastStatusCheck) : 'No status check found');

// 3. Check user notifications
const userNotifications = localStorage.getItem('userNotifications');
console.log('\n3. User Notifications:', userNotifications ? JSON.parse(userNotifications) : 'No notifications found');

// 4. Test: Clear status check to force notification
console.log('\n4. To test notifications, run this command:');
console.log('   localStorage.removeItem("userLastStatusCheck");');
console.log('   Then refresh the page and approve/reject a note from admin panel');

// 5. Manual test: Create a test notification
function createTestNotification() {
    const notes = JSON.parse(localStorage.getItem('uploadedNotes') || '[]');
    if (notes.length === 0) {
        console.log('\n❌ No notes found. Upload a note first!');
        return;
    }
    
    // Find a pending note
    const pendingNote = notes.find(n => n.status === 'pending');
    if (!pendingNote) {
        console.log('\n❌ No pending notes found. All notes are already approved/rejected.');
        return;
    }
    
    console.log('\n✅ Found pending note:', pendingNote.notesName);
    console.log('   Run this to simulate approval:');
    console.log(`   
    const notes = JSON.parse(localStorage.getItem('uploadedNotes'));
    const note = notes.find(n => n.id === ${pendingNote.id});
    note.status = 'approved';
    localStorage.setItem('uploadedNotes', JSON.stringify(notes));
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'uploadedNotes',
        oldValue: null,
        newValue: JSON.stringify(notes)
    }));
    console.log('✅ Note approved! Check navbar for notification.');
    `);
}

// 6. Reset everything
function resetNotifications() {
    localStorage.removeItem('userLastStatusCheck');
    localStorage.removeItem('userNotifications');
    console.log('✅ Notifications reset! Refresh the page.');
}

console.log('\n=== AVAILABLE FUNCTIONS ===');
console.log('createTestNotification() - Create a test notification');
console.log('resetNotifications() - Reset all notifications');

// Auto-run test
createTestNotification();
