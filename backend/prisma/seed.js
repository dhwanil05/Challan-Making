import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    const company = await prisma.company.upsert({
        where: { id: 'seed-company-uvita' },
        update: {},
        create: {
            id: 'seed-company-uvita',
            name: 'U VITA Textiles',
            tradeName: 'U VITA',
            gstin: '24AABCU9603R1ZM',
            address: 'Ring Road, Surat',
            city: 'Surat',
            state: 'Gujarat',
            pincode: '395002',
            phone: '+91 98765 43210',
            email: 'info@uvitatex.com',
            challanPrefix: 'UV',
            invoicePrefix: 'INV',
            challanCounter: 1,
            invoiceCounter: 1,
            defaultCgst: 2.5,
            defaultSgst: 2.5,
            defaultIgst: 5,
            terms: 'Goods once sold will not be taken back. Subject to Surat jurisdiction.',
            isDefault: true,
        },
    });
    const password = await bcrypt.hash('admin123', 12);
    await prisma.user.upsert({
        where: { email: 'admin@uvita.com' },
        update: {},
        create: {
            email: 'admin@uvita.com',
            password,
            name: 'Admin User',
            role: 'ADMIN',
            companyId: company.id,
        },
    });
    await prisma.user.upsert({
        where: { email: 'staff@uvita.com' },
        update: {},
        create: {
            email: 'staff@uvita.com',
            password: await bcrypt.hash('staff123', 12),
            name: 'Staff User',
            role: 'STAFF',
            companyId: company.id,
        },
    });
    const customers = await Promise.all([
        prisma.customer.create({
            data: {
                companyId: company.id,
                name: 'Jatin Fabrics',
                gstin: '24AAAAA0000A1Z5',
                mobile: '9876543210',
                address: 'Udhna, Surat',
                city: 'Surat',
                state: 'Gujarat',
            },
        }),
        prisma.customer.create({
            data: {
                companyId: company.id,
                name: 'Shree Krishna Traders',
                mobile: '9123456789',
                address: 'Ring Road, Surat',
                city: 'Surat',
                state: 'Gujarat',
            },
        }),
        prisma.customer.create({
            data: {
                companyId: company.id,
                name: 'Mumbai Textile Hub',
                gstin: '27BBBBB0000B1Z5',
                mobile: '9988776655',
                city: 'Mumbai',
                state: 'Maharashtra',
            },
        }),
    ]);
    const products = await Promise.all([
        prisma.product.create({
            data: {
                companyId: company.id,
                fabricName: 'Rayon Printed',
                designNumber: 'RP-4521',
                colour: 'Navy Blue',
                category: 'Rayon',
                rate: 85,
                stockQuantity: 500,
                minStock: 50,
                hsnCode: '5407',
                gstPercent: 5,
            },
        }),
        prisma.product.create({
            data: {
                companyId: company.id,
                fabricName: 'Georgette Embroidery',
                designNumber: 'GE-1102',
                colour: 'Maroon',
                category: 'Georgette',
                rate: 120,
                stockQuantity: 30,
                minStock: 50,
                hsnCode: '5407',
                gstPercent: 5,
            },
        }),
        prisma.product.create({
            data: {
                companyId: company.id,
                fabricName: 'Cotton Voile',
                designNumber: 'CV-8890',
                colour: 'White',
                category: 'Cotton',
                rate: 65,
                stockQuantity: 800,
                minStock: 100,
                hsnCode: '5208',
                gstPercent: 5,
            },
        }),
    ]);
    await prisma.notification.createMany({
        data: [
            {
                companyId: company.id,
                title: 'Low Stock Alert',
                message: 'Georgette Embroidery (GE-1102) is below minimum stock level.',
                type: 'warning',
                link: '/inventory',
            },
            {
                companyId: company.id,
                title: 'Welcome to U VITA ERP',
                message: 'Your textile ERP system is ready. Create your first challan today!',
                type: 'info',
            },
        ],
    });
    console.log('Seed completed:');
    console.log('  Admin: admin@uvita.com / admin123');
    console.log('  Staff: staff@uvita.com / staff123');
    console.log(`  Company: ${company.name}`);
    console.log(`  Customers: ${customers.length}, Products: ${products.length}`);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
