"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // Create demo lecturer
    const hashedPassword = await bcrypt_1.default.hash('password123', 10);
    const lecturer = await prisma.user.upsert({
        where: { email: 'lecturer@kolabri.edu' },
        update: {},
        create: {
            email: 'lecturer@kolabri.edu',
            password: hashedPassword,
            name: 'Dr. Ahmad Lecturer',
            role: client_1.UserRole.lecturer,
        },
    });
    console.log('✅ Created lecturer:', lecturer.email);
    // Create demo students
    const studentEmails = [
        'student1@kolabri.edu',
        'student2@kolabri.edu',
        'student3@kolabri.edu',
    ];
    const students = [];
    for (const email of studentEmails) {
        const student = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                password: hashedPassword,
                name: `Student ${email.split('@')[0]}`,
                role: client_1.UserRole.student,
            },
        });
        students.push(student);
        console.log('✅ Created student:', student.email);
    }
    // Create demo course
    const course = await prisma.course.upsert({
        where: { code: 'CS401' },
        update: {},
        create: {
            code: 'CS401',
            name: 'Human-Computer Interaction',
            description: 'Learn the principles of designing user-centered interfaces',
            joinCode: 'HCI2024',
            ownerId: lecturer.id,
        },
    });
    console.log('✅ Created course:', course.code, '-', course.name);
    // Enroll students in course
    for (const student of students) {
        await prisma.courseStudent.upsert({
            where: {
                courseId_userId: {
                    courseId: course.id,
                    userId: student.id,
                },
            },
            update: {},
            create: {
                courseId: course.id,
                userId: student.id,
            },
        });
    }
    console.log('✅ Enrolled', students.length, 'students in course');
    // Create a demo group
    const group = await prisma.group.upsert({
        where: { id: 'demo-group-1' },
        update: {},
        create: {
            id: 'demo-group-1',
            name: 'Team Alpha',
            courseId: course.id,
        },
    });
    console.log('✅ Created group:', group.name);
    // Add students to group
    for (const student of students) {
        await prisma.groupMember.upsert({
            where: {
                groupId_userId: {
                    groupId: group.id,
                    userId: student.id,
                },
            },
            update: {},
            create: {
                groupId: group.id,
                userId: student.id,
            },
        });
    }
    console.log('✅ Added', students.length, 'members to group');
    console.log('');
    console.log('🎉 Seeding completed!');
    console.log('');
    console.log('Demo Credentials:');
    console.log('  Lecturer: lecturer@kolabri.edu / password123');
    console.log('  Student:  student1@kolabri.edu / password123');
    console.log('  Course Join Code: HCI2024');
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
