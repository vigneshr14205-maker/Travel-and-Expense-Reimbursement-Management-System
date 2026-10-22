import React, { useState, useEffect } from 'react';
import confetti from './services/confetti';
import { api } from './services/api';
import Navbar from './components/Navbar';
import StatsCards from './components/StatsCards';
import TravelRequestsView from './components/TravelRequestsView';
import ReimbursementsView from './components/ReimbursementsView';
import ManualAuditStation from './components/ManualAuditStation';
import DisbursementView from './components/DisbursementView';
import AnalyticsPolicyView from './components/AnalyticsPolicyView';
import AuditLogView from './components/AuditLogView';
import VoucherModal from './components/VoucherModal';
import LoginPage from './components/LoginPage';

export default function App() {
    const [activeTab, setActiveTab] = useState('travel-requests');
    const [allUsers, setAllUsers] = useState([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const handleLoginSuccess = (persona) => {
        setCurrentUser(persona);
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setActiveTab('travel-requests');
    };

    const [travelRequests, setTravelRequests] = useState([]);
    const [claims, setClaims] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [policy, setPolicy] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);

    // Active sub-modals / screens
    const [auditingClaim, setAuditingClaim] = useState(null);
    const [viewingVoucher, setViewingVoucher] = useState(null);
    const [prefilledTR, setPrefilledTR] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ msg, type });
        setTimeout(() => setToastMessage(null), 4500);
    };

    // Load all data
    const loadData = async () => {
        try {
            const [uRes, trRes, clmRes, anRes, polRes, logRes] = await Promise.all([
                api.getUsers(),
                api.getTravelRequests(),
                api.getClaims(),
                api.getAnalytics(),
                api.getPolicy(),
                api.getAuditLogs()
            ]);

            if (uRes.success && uRes.data.length > 0) {
                setAllUsers(uRes.data);
                if (!currentUser?.userId) {
                    const defaultUser = uRes.data.find(u => u.role === 'finance') || uRes.data[0];
                    // Do not auto-set if login required, but fallback user available
                }
            }

            if (trRes.success) setTravelRequests(trRes.data);
            if (clmRes.success) setClaims(clmRes.data);
            if (anRes.success) setAnalytics(anRes.data);
            if (polRes.success) setPolicy(polRes.data);
            if (logRes.success) setAuditLogs(logRes.data);
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Handlers
    const handleCreateRequest = async (payload) => {
        try {
            const res = await api.createTravelRequest(payload);
            if (res.success) {
                showToast(`Travel Request ${res.data.requestId} created and routed to Manager!`);
                await loadData();
            } else {
                alert(res.error);
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleReviewRequest = async (requestId, payload) => {
        try {
            const res = await api.reviewTravelRequest(requestId, payload);
            if (res.success) {
                showToast(`Request ${requestId} status updated to: ${payload.decision}!`);
                await loadData();
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDisburseAdvance = async (requestId, payload) => {
        try {
            const res = await api.disburseAdvance(requestId, payload);
            if (res.success) {
                showToast(`Cash Advance disbursed for ${requestId}!`);
                await loadData();
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleCreateClaim = async (payload) => {
        try {
            const res = await api.createClaim(payload);
            if (res.success) {
                showToast(`Claim ${res.data.claimId} submitted for Finance Manual Audit!`);
                await loadData();
                setActiveTab('reimbursements');
            } else {
                alert(res.error);
            }
        } catch (err) {
            alert(err.message);
        }
    };

    // Launch Manual Audit Station
    const handleOpenAuditStation = (claim) => {
        setAuditingClaim(claim);
        setActiveTab('manual-audit');
    };

    // Save Manual Audit Decisions
    const handleSaveAudit = async (claimId, payload) => {
        try {
            const res = await api.manualAuditClaim(claimId, payload);
            if (res.success) {
                try {
                    confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
                } catch (e) { }
                showToast(`Manual Line Audit completed for Claim ${claimId}!`);
                await loadData();
                setAuditingClaim(null);
                setActiveTab('disbursements');
            } else {
                alert(res.error);
            }
        } catch (err) {
            alert(err.message);
        }
    };

    // Disburse Claim
    const handleDisburseClaim = async (claimId, payload) => {
        try {
            const res = await api.disburseClaim(claimId, payload);
            if (res.success) {
                try {
                    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                } catch (e) { }
                showToast(`Claim ${claimId} disbursed! Official Settlement Voucher generated.`);
                await loadData();
                // Automatically open voucher modal
                const vRes = await api.getVoucher(claimId);
                if (vRes.success) {
                    setViewingVoucher(vRes.data);
                }
            } else {
                alert(res.error);
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleOpenVoucher = async (claim) => {
        try {
            const res = await api.getVoucher(claim.claimId);
            if (res.success) {
                setViewingVoucher(res.data);
            } else {
                alert(res.error);
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleUpdatePolicy = async (payload) => {
        try {
            const res = await api.updatePolicy(payload);
            if (res.success) {
                showToast('Corporate travel policy rules saved successfully!');
                await loadData();
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleResetDemo = async () => {
        if (window.confirm('Reset all demo data back to default corporate travel sample state?')) {
            await api.resetSeed();
            showToast('Demo data re-seeded successfully!');
            await loadData();
        }
    };

    // Counts for badges
    const pendingAuditCount = claims.filter(c => c.status === 'Submitted' || c.status === 'Under_Manual_Audit').length;
    const pendingManagerCount = travelRequests.filter(r => r.status === 'Pending_Approval').length;

    if (!isAuthenticated) {
        return (
            <LoginPage
                allUsers={allUsers}
                onLoginSuccess={handleLoginSuccess}
            />
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Toast Notification */}
            {toastMessage && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '24px',
                    zIndex: 9999,
                    background: toastMessage.type === 'error' ? '#ef4444' : '#10b981',
                    color: '#ffffff',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <span>{toastMessage.msg}</span>
                </div>
            )}

            {/* Main Navbar */}
            <Navbar
                activeTab={activeTab}
                setActiveTab={(tab) => {
                    setActiveTab(tab);
                    if (tab !== 'manual-audit') setAuditingClaim(null);
                }}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                allUsers={allUsers}
                pendingAuditCount={pendingAuditCount}
                pendingManagerCount={pendingManagerCount}
                onResetDemo={handleResetDemo}
                onLogout={handleLogout}
            />

            {/* Main Page Body Container */}
            <main style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '24px 24px' }}>
                {/* Top KPI Cards (Always visible on main views) */}
                {activeTab !== 'manual-audit' && (
                    <StatsCards
                        stats={analytics?.kpis}
                        onCardClick={(tabId) => setActiveTab(tabId)}
                    />
                )}

                {/* Tab 1: Travel Authorizations */}
                {activeTab === 'travel-requests' && (
                    <TravelRequestsView
                        travelRequests={travelRequests}
                        currentUser={currentUser}
                        onCreateRequest={handleCreateRequest}
                        onReviewRequest={handleReviewRequest}
                        onDisburseAdvance={handleDisburseAdvance}
                        onNavigateToClaim={(tr) => {
                            setPrefilledTR(tr);
                            setActiveTab('reimbursements');
                        }}
                    />
                )}

                {/* Tab 2: Reimbursement Claims */}
                {activeTab === 'reimbursements' && (
                    <ReimbursementsView
                        claims={claims}
                        travelRequests={travelRequests}
                        currentUser={currentUser}
                        onCreateClaim={handleCreateClaim}
                        onOpenAuditStation={handleOpenAuditStation}
                        onOpenVoucher={handleOpenVoucher}
                        prefilledRequest={prefilledTR}
                    />
                )}

                {/* Tab 3: Manual Audit Workstation */}
                {activeTab === 'manual-audit' && (
                    <div>
                        {auditingClaim ? (
                            <ManualAuditStation
                                claim={auditingClaim}
                                currentUser={currentUser}
                                onSaveAudit={handleSaveAudit}
                                onBack={() => setAuditingClaim(null)}
                            />
                        ) : (
                            <div>
                                <div style={{ marginBottom: '20px' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>
                                        Finance Manual Audit Station
                                    </h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        Select an expense claim below to launch the side-by-side receipt inspector & line-by-line adjustment workstation.
                                    </p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
                                    {claims
                                        .filter(c => c.status === 'Submitted' || c.status === 'Under_Manual_Audit')
                                        .map(claim => (
                                            <div key={claim.claimId} className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #8b5cf6' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span className="font-mono" style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 700 }}>
                                                        {claim.claimId}
                                                    </span>
                                                    <span className="status-badge under_manual_audit">
                                                        Awaiting Audit
                                                    </span>
                                                </div>

                                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                                                    {claim.tripTitle}
                                                </h3>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                                                    Employee: <strong style={{ color: '#ffffff' }}>{claim.employeeName}</strong> &bull; {claim.department}
                                                </div>

                                                <div style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    borderRadius: '8px',
                                                    padding: '10px 14px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '16px',
                                                    border: '1px solid var(--border-subtle)'
                                                }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Items</span>
                                                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{claim.expenseItems?.length || 0} Receipts</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Gross Claim</span>
                                                        <div className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                                                            ${Number(claim.summary?.totalClaimedAmountUSD || 0).toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    className="btn btn-primary"
                                                    style={{ width: '100%', background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}
                                                    onClick={() => handleOpenAuditStation(claim)}
                                                >
                                                    <span>Launch Side-by-Side Auditor</span>
                                                </button>
                                            </div>
                                        ))}
                                </div>

                                {claims.filter(c => c.status === 'Submitted' || c.status === 'Under_Manual_Audit').length === 0 && (
                                    <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center', marginTop: '20px' }}>
                                        <h4 style={{ color: '#ffffff', marginBottom: '6px' }}>All Claims Successfully Audited</h4>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            There are currently no expense claims in the manual audit queue.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 4: Disbursements */}
                {activeTab === 'disbursements' && (
                    <DisbursementView
                        claims={claims}
                        currentUser={currentUser}
                        onDisburseClaim={handleDisburseClaim}
                        onOpenVoucher={handleOpenVoucher}
                    />
                )}

                {/* Tab 5: Analytics & Policy */}
                {activeTab === 'analytics-policy' && (
                    <AnalyticsPolicyView
                        analytics={analytics}
                        policy={policy}
                        currentUser={currentUser}
                        onUpdatePolicy={handleUpdatePolicy}
                    />
                )}

                {/* Tab 6: Audit Trail */}
                {activeTab === 'audit-trail' && (
                    <AuditLogView logs={auditLogs} />
                )}
            </main>

            {/* Official Voucher Modal */}
            {viewingVoucher && (
                <VoucherModal
                    voucher={viewingVoucher}
                    onClose={() => setViewingVoucher(null)}
                />
            )}
        </div>
    );
}
